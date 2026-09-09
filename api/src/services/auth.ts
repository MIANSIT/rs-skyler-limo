import { createHash, randomBytes } from "node:crypto";

import { execute, queryOne, type RowDataPacket } from "../db.js";
import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

export type AdminRole = "owner" | "dispatcher";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
};

type AdminUserRow = RowDataPacket & {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: AdminRole;
  is_active: number;
};

type SessionRow = RowDataPacket & {
  session_id: number;
  expires_at: Date;
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  is_active: number;
};

/**
 * The token goes to the caller once and is never stored. What lands in the
 * database is its SHA-256, so a leaked dump cannot be replayed as a login.
 * SHA-256 is right here where bcrypt/scrypt would be wrong: the input is 256
 * bits of CSPRNG output, not a guessable human password, so there is nothing
 * for an attacker to brute-force and no reason to pay a KDF's cost on every
 * authenticated request.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type LoginResult = {
  token: string;
  expiresAt: Date;
  user: AdminUser;
};

export async function login(
  email: string,
  password: string,
  context: { userAgent?: string; ip?: string },
): Promise<LoginResult> {
  const row = await queryOne<AdminUserRow>(
    `SELECT id, email, name, password_hash, role, is_active
       FROM admin_users
      WHERE email = :email
      LIMIT 1`,
    { email: email.trim().toLowerCase() },
  );

  // Hash against a throwaway value when the account is missing so a wrong
  // address and a wrong password take the same time to reject.
  const stored =
    row?.password_hash ??
    "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const passwordMatches = await verifyPassword(password, stored);

  if (!row || !passwordMatches || row.is_active !== 1) {
    throw ApiError.unauthorized("Those details do not match an account.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);

  await execute(
    `INSERT INTO admin_sessions
       (admin_user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (:userId, :tokenHash, :expiresAt, :userAgent, :ip)`,
    {
      userId: row.id,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ip: context.ip?.slice(0, 45) ?? null,
    },
  );

  await execute(
    `UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id`,
    { id: row.id },
  );

  return {
    token,
    expiresAt,
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
  };
}

/**
 * Resolves a bearer token to its operator, or null. Expired and revoked
 * sessions resolve to null; deactivated accounts do too, without needing their
 * sessions deleted first.
 */
export async function resolveSession(
  token: string,
): Promise<{ sessionId: number; user: AdminUser; expiresAt: Date } | null> {
  if (!token) return null;

  const row = await queryOne<SessionRow>(
    `SELECT s.id AS session_id, s.expires_at,
            u.id, u.email, u.name, u.role, u.is_active
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
      WHERE s.token_hash = :tokenHash
        AND s.expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    { tokenHash: hashToken(token) },
  );

  if (!row || row.is_active !== 1) return null;

  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
  };
}

export async function touchSession(sessionId: number): Promise<void> {
  await execute(
    `UPDATE admin_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = :id`,
    { id: sessionId },
  );
}

export async function logout(token: string): Promise<void> {
  await execute(`DELETE FROM admin_sessions WHERE token_hash = :tokenHash`, {
    tokenHash: hashToken(token),
  });
}

/** Housekeeping — called on boot and hourly. */
export async function purgeExpiredSessions(): Promise<number> {
  const result = await execute(
    `DELETE FROM admin_sessions WHERE expires_at < UTC_TIMESTAMP()`,
  );
  return result.affectedRows;
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  role?: AdminRole;
}): Promise<AdminUser> {
  const email = input.email.trim().toLowerCase();

  const existing = await queryOne<RowDataPacket & { id: number }>(
    `SELECT id FROM admin_users WHERE email = :email LIMIT 1`,
    { email },
  );
  if (existing) {
    throw ApiError.conflict("An operator with that email already exists.");
  }

  const result = await execute(
    `INSERT INTO admin_users (email, name, password_hash, role)
     VALUES (:email, :name, :passwordHash, :role)`,
    {
      email,
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "dispatcher",
    },
  );

  return {
    id: result.insertId,
    email,
    name: input.name.trim(),
    role: input.role ?? "dispatcher",
  };
}
