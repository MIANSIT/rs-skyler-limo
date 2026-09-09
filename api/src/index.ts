import { createApp } from "./app.js";
import { pool } from "./db.js";
import { env } from "./env.js";
import { purgeExpiredSessions } from "./services/auth.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`RSSkyler API listening on :${env.PORT} (${env.NODE_ENV})`);
});

// Expired rows are dead weight and a small liability; clear them on boot and
// once an hour after that.
void purgeExpiredSessions().catch(() => {});
const sessionSweep = setInterval(
  () => void purgeExpiredSessions().catch(() => {}),
  60 * 60 * 1000,
);
sessionSweep.unref();

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down.`);
  clearInterval(sessionSweep);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });

  // Do not let an open keep-alive connection hold a deploy hostage.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
