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
  /** Loopback by default; the API has no business answering the internet. */
  HOST: z.string().min(1).default("127.0.0.1"),

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

  /**
   * Where uploaded vehicle photography is written. Kept outside the code tree
   * so a deploy that replaces the application directory does not delete the
   * client's photo library.
   */
  UPLOADS_DIR: z.string().min(1).default("./var/uploads"),

  /**
   * Public base URL for those files, as a browser will see them. In production
   * nginx serves the uploads directory from the site's own origin; in dev the
   * API serves them itself.
   */
  UPLOADS_BASE_URL: z.string().min(1).default("http://127.0.0.1:4000/uploads"),

  /**
   * Google Places, used for address autocomplete and for deciding whether an
   * address is inside New York City. Optional: without it the booking form
   * falls back to a plain address field and a borough selector, and fixed
   * airport fares still work.
   *
   * Server-side only — it must never be exposed with a NEXT_PUBLIC_ prefix.
   */
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),

  /* ---------------------------------------------------------------- mail */

  /**
   * The mailbox everything is sent from, and its app password.
   *
   * Both optional together: with neither set the API runs exactly as before and
   * simply logs that it would have sent. That keeps a developer's checkout
   * working without handing every developer the live mailbox, and means a
   * missing password degrades to "no email" rather than "no bookings".
   *
   * MAIL_APP_PASSWORD must be an **app password**, not the account password.
   * Yahoo and Gmail both refuse plain account passwords over SMTP.
   *
   * ⚠️  This is `MAIL_USER`, not `MAIL`, and must stay that way.
   *
   * `MAIL` is a POSIX shell variable: login shells and `sudo` set it to the
   * user's mail spool, `/var/mail/rsskyler` on this server. dotenv does not
   * overwrite a variable that is already present in the environment, so a
   * `MAIL=` line in the .env file was silently ignored in favour of that path
   * and the address failed validation. It cost a deploy to find. Any name here
   * that a shell might also define will do the same thing.
   */
  MAIL_USER: z.email().optional(),
  MAIL_APP_PASSWORD: z.string().min(1).optional(),

  /** Defaults suit Yahoo, which is where the business mailbox lives. */
  MAIL_HOST: z.string().min(1).default("smtp.mail.yahoo.com"),
  /** 465 is implicit TLS. Port 587 would need `secure` false and STARTTLS. */
  MAIL_PORT: z.coerce.number().int().positive().default(465),
  MAIL_FROM_NAME: z.string().min(1).default("RSSkyler Limo"),

  /**
   * Who in the business is told about a new booking, comma separated.
   *
   * These are operational recipients, not marketing. They go in the envelope as
   * Bcc so one operator's address is never exposed to another recipient, and
   * never to the customer.
   */
  MAIL_OPS_RECIPIENTS: z
    .string()
    .default(
      "raselislam9964@gmail.com,mhyeasin357@gmail.com,miansofficial@gmail.com",
    )
    .transform((value) =>
      value
        .split(",")
        .map((address) => address.trim().toLowerCase())
        .filter(Boolean),
    ),

  /**
   * Where a "track this booking" link should point. Used only in email bodies.
   */
  SITE_BASE_URL: z.string().min(1).default("http://localhost:3000"),
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
