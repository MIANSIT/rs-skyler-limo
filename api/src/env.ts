import { config } from "dotenv";
import { z } from "zod";

config();

/**
 * Fail at boot rather than at 3 a.m. on the first booking. Every value the API
 * needs is declared here; nothing reads `process.env` directly below this file.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().min(1).default("rsskyler"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  /**
   * Origins allowed to call the public endpoints from a browser. The admin
   * endpoints are never called from a browser — the Next.js server calls them
   * with a bearer token — so they do not depend on this list.
   */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid API environment:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
