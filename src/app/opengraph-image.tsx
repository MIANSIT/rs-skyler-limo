import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { siteName } from "@/lib/site";

/**
 * The card every share of this site renders: Slack, iMessage, WhatsApp,
 * LinkedIn, X, Facebook.
 *
 * Generated rather than drawn once in a design tool so the wording cannot drift
 * from the site's own. `alt` is what a screen reader announces when the card
 * appears in a feed, so it says what the image says.
 *
 * Satori — what `ImageResponse` renders with — accepts only ttf, otf and woff,
 * and this repository carries no font binary. Fraunces and Public Sans are
 * therefore unavailable here and the default face is used. The brand survives
 * through the things that do carry: the midnight ground, the gold rule, the RS
 * mark, and the two-weight wordmark with LIMO in gold. Supply a Fraunces ttf
 * and pass it in `fonts` if the typeface ever matters more than the weight.
 */

export const alt = `${siteName} — premium chauffeur service in New York City`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MIDNIGHT = "#0B2142";
const MIDNIGHT_DEEP = "#07152B";
const GOLD = "#D4A017";

/**
 * Inlined as a data URI: Satori cannot read a relative path, and a URL would
 * make the build depend on the site being up to build the site. A 260px copy
 * of the mark rather than the 625KB original — the whole card, fonts and
 * assets included, has to fit in 500KB.
 */
const markDataUri = (() => {
  try {
    const bytes = readFileSync(join(process.cwd(), "src", "assets", "og-mark.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
})();

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: MIDNIGHT,
          backgroundImage: `linear-gradient(135deg, ${MIDNIGHT} 0%, ${MIDNIGHT_DEEP} 100%)`,
          padding: 72,
        }}
      >
        {/* Lockup: mark, hairline, wordmark — the header's arrangement. */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {markDataUri ? (
            <img src={markDataUri} alt="" width={118} height={107} />
          ) : null}
          <div style={{ display: "flex", width: 1, height: 84, background: "rgba(255,255,255,0.25)" }} />
          <div style={{ display: "flex", fontSize: 46, letterSpacing: "0.048em" }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>RSSKYLER</span>
            <span style={{ color: GOLD, fontWeight: 400 }}>LIMO</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              lineHeight: 1.1,
              color: "#FFFFFF",
              fontWeight: 600,
              maxWidth: 940,
            }}
          >
            Premium chauffeur service in New York City
          </div>

          {/* Gold as a rule on a dark ground — never as a field. */}
          <div style={{ display: "flex", width: 132, height: 4, background: GOLD, marginTop: 36 }} />

          <div
            style={{
              display: "flex",
              fontSize: 29,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.72)",
              marginTop: 32,
              maxWidth: 900,
            }}
          >
            Airport transfers at published fixed fares, hourly charters,
            corporate accounts, weddings and events — across all five boroughs.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
