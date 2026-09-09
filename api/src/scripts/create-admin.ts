import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { pool } from "../db.js";
import { createAdminUser, type AdminRole } from "../services/auth.js";

/**
 * `npm run create-admin` — the supported way to add an operator. There is no
 * self-service signup and no seeded default password, because a dashboard of
 * customer addresses should never ship with credentials anyone can guess.
 */
async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question("Email: ")).trim();
    const name = (await rl.question("Name: ")).trim();
    const role = ((await rl.question("Role [owner/dispatcher] (dispatcher): "))
      .trim() || "dispatcher") as AdminRole;
    const password = (await rl.question("Password (min 12 characters): ")).trim();

    if (!email || !name || !password) {
      throw new Error("Email, name and password are all required.");
    }
    if (password.length < 12) {
      throw new Error("Use at least 12 characters.");
    }
    if (role !== "owner" && role !== "dispatcher") {
      throw new Error("Role must be 'owner' or 'dispatcher'.");
    }

    const user = await createAdminUser({ email, name, password, role });
    console.log(`\nCreated ${user.name} <${user.email}> as ${user.role}.`);
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
