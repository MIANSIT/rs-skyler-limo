/**
 * Shared pieces for every email the API sends.
 *
 * Email is not the web. Three constraints drive everything here:
 *
 *  - **Tables, not flexbox.** Outlook renders through Word's HTML engine, which
 *    has no flex and no grid. Every layout below is a table with inline styles.
 *  - **No webfonts.** Fraunces and Public Sans cannot be loaded, so the display
 *    face falls back to Georgia (a serif with comparable colour on the page)
 *    and the text face to the Helvetica stack. That is a deliberate substitution
 *    rather than a lapse — the brand's *typographic hierarchy* survives even
 *    where its exact faces cannot.
 *  - **No remote images.** Most clients block them by default, so a logo image
 *    would arrive as a broken box on first open. The wordmark is set as live
 *    text, which the brand guide asks for anyway.
 *
 * The five brand colours are used exactly as the guide requires: gold never
 * carries text on a light ground, only on midnight, and never as a field.
 */

export const BRAND = {
  midnight: "#0B2142",
  gold: "#D4A017",
  charcoal: "#2C2C2F",
  white: "#FFFFFF",
  grey: "#F5F5F5",
} as const;

/** Fraunces is unavailable; Georgia carries the closest weight and colour. */
export const DISPLAY_FONT = "Georgia, 'Times New Roman', serif";
/** Public Sans is unavailable; this is the standard humanist fallback chain. */
export const SANS_FONT =
  "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', sans-serif";

const TIME_ZONE = "America/New_York";

/**
 * Everything a customer typed is escaped before it reaches the markup.
 *
 * A booking form is a public endpoint: a name, an address or a note can contain
 * anything at all. Some clients render a subset of HTML, so an unescaped
 * `<` in a "special instructions" box is at best a mangled email and at worst
 * markup injected into the operator's inbox.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Integer cents to `$1,234.56`. Money is never a float in this codebase. */
export function formatMoney(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Timestamps are UTC in the database. A chauffeur booking is meaningless in any
 * zone but the one the car turns up in, so everything a person reads is New
 * York time and says so.
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Both clocks, as the trade sheet does it: `7:00 AM / 07:00`. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const twelve = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  const twentyFour = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${twelve} / ${twentyFour}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** `luxury-sedan` to `Luxury Sedan`, for when the vehicle row has gone away. */
export function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The wordmark, set per the brand guide: RSSKYLER semibold, LIMO regular, one
 * baseline, 4.8% letter-spacing. On midnight, RSSKYLER is white and LIMO gold.
 */
function wordmark(): string {
  return `<span style="font-family:${DISPLAY_FONT};font-size:20px;letter-spacing:0.048em;color:${BRAND.white};font-weight:600;">RSSKYLER<span style="color:${BRAND.gold};font-weight:400;">LIMO</span></span>`;
}

/** A label/value row inside a bordered panel. */
export function detailRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:10px 16px;border-bottom:1px solid rgba(11,33,66,0.10);font-family:${SANS_FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(44,44,47,0.66);width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 16px;border-bottom:1px solid rgba(11,33,66,0.10);font-family:${SANS_FONT};font-size:15px;color:${BRAND.midnight};font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;
}

/** A titled panel: gold rule above a light-grey box. Gold as a rule, not text. */
export function panel(title: string, rows: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;border-collapse:collapse;">
    <tr>
      <td style="border-top:2px solid ${BRAND.gold};padding:14px 16px 8px 16px;background:${BRAND.grey};font-family:${SANS_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.charcoal};font-weight:700;">${escapeHtml(title)}</td>
    </tr>
    <tr>
      <td style="background:${BRAND.grey};padding:0 0 4px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows}</table>
      </td>
    </tr>
  </table>`;
}

/**
 * The document shell.
 *
 * `eyebrow`, `headline` and the three header facts mirror the layout of a trade
 * reservation sheet — the date, the time and the reference sit top right where
 * a dispatcher expects to find them.
 */
export function shell({
  preheader,
  eyebrow,
  headline,
  intro,
  headerFacts,
  body,
  footerNote,
}: {
  /** The grey line a client shows beside the subject. Never left to chance. */
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  headerFacts: { label: string; value: string }[];
  body: string;
  footerNote: string;
}): string {
  const facts = headerFacts
    .map(
      (fact) => `
        <tr>
          <td style="padding:2px 12px 2px 0;font-family:${SANS_FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.60);white-space:nowrap;">${escapeHtml(fact.label)}</td>
          <td style="padding:2px 0;font-family:${SANS_FONT};font-size:14px;color:${BRAND.white};font-weight:600;white-space:nowrap;">${escapeHtml(fact.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#E9EBEF;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E9EBEF;">
  <tr>
    <td align="center" style="padding:24px 12px;">

      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:100%;background:${BRAND.white};border-collapse:collapse;">

        <!-- Midnight header: the brand's consistent chrome. -->
        <tr>
          <td style="background:${BRAND.midnight};padding:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:top;">
                  ${wordmark()}
                  <div style="margin-top:10px;font-family:${SANS_FONT};font-size:12px;line-height:1.7;color:rgba(255,255,255,0.65);">
                    ${escapeHtml(CONTACT.phone)}<br>
                    ${escapeHtml(CONTACT.email)}
                  </div>
                </td>
                <td style="vertical-align:top;text-align:right;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">${facts}</table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Title block -->
        <tr>
          <td style="padding:28px 24px 0 24px;">
            <div style="font-family:${SANS_FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(44,44,47,0.66);font-weight:700;">${escapeHtml(eyebrow)}</div>
            <h1 style="margin:10px 0 0 0;font-family:${DISPLAY_FONT};font-size:26px;line-height:1.25;font-weight:600;color:${BRAND.midnight};">${escapeHtml(headline)}</h1>
            <div style="margin:14px 0 0 0;width:64px;height:2px;background:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</div>
            <p style="margin:18px 0 24px 0;font-family:${SANS_FONT};font-size:15px;line-height:1.7;color:${BRAND.charcoal};">${escapeHtml(intro)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 24px 8px 24px;">${body}</td>
        </tr>

        <!-- Midnight footer -->
        <tr>
          <td style="background:${BRAND.midnight};padding:24px;">
            <p style="margin:0 0 14px 0;font-family:${SANS_FONT};font-size:13px;line-height:1.7;color:rgba(255,255,255,0.70);">${escapeHtml(footerNote)}</p>
            <p style="margin:0;font-family:${SANS_FONT};font-size:13px;line-height:1.9;color:rgba(255,255,255,0.70);">
              <a href="tel:${escapeHtml(CONTACT.phoneHref)}" style="color:${BRAND.white};text-decoration:none;font-weight:600;">${escapeHtml(CONTACT.phone)}</a><br>
              <a href="mailto:${escapeHtml(CONTACT.email)}" style="color:rgba(255,255,255,0.70);text-decoration:underline;">${escapeHtml(CONTACT.email)}</a>
            </p>
            <p style="margin:16px 0 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,0.15);font-family:${SANS_FONT};font-size:11px;line-height:1.7;color:rgba(255,255,255,0.45);">
              RSSkyler Limo &middot; Chauffeured travel across all five boroughs of New York City.<br>
              All times are New York time.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Duplicated from the site's `src/lib/content.ts` on purpose — the API cannot
 * import from the Next app. If the number changes there, change it here.
 */
export const CONTACT = {
  phone: "+1 (914) 338-6414",
  phoneHref: "+19143386414",
  email: "rsskylerlimo@yahoo.com",
} as const;
