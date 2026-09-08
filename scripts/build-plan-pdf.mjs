#!/usr/bin/env node
/**
 * Renders docs/build-plan.html to a client-ready PDF.
 *
 * The HTML is authored as an Artifact fragment — no <html>/<head>, and its own
 * @media print rules drop colour to save ink on a desktop Cmd+P. A PDF that
 * gets emailed to a client is read on screen, so this wraps the fragment in a
 * real document and overrides those rules to keep the brand ground.
 *
 * Usage:  npm run plan:pdf
 *         CHROME=/path/to/chrome npm run plan:pdf
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "docs", "build-plan.html");
const output = join(root, "docs", "RSSkyler-Limo-Build-Plan.pdf");

const CHROME_CANDIDATES = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

/**
 * Two things have to be rescaled for paper. The root font size, because every
 * gap in the document is rem-based — scaling only body text would leave
 * desktop-sized whitespace around 10pt type. And the reading measure: 68ch
 * suits a wide viewport but wastes a third of a Letter column.
 */
const printCss = `
@page { size: letter; margin: 13mm 15mm; }

@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  html { font-size: 10pt; }
  body { background: #fff !important; color: var(--ink) !important; font-size: 1rem; line-height: 1.55; }

  .wrap { max-width: none; padding: 0; gap: 1.5rem; }
  section { gap: 0.85rem; }
  section > .eyebrow + h2 { margin-top: -0.6rem; }
  p, li { max-width: 84ch; }
  h2 { font-size: 1.45rem; }

  .masthead {
    background: var(--midnight) !important;
    color: #fff !important;
    margin: 0 0 0.25rem !important;
    padding: 1.75rem !important;
    border-bottom: 0 !important;
    gap: 0.5rem;
  }
  .masthead h1 { color: #fff !important; font-size: 2rem; }
  .masthead p { color: rgba(255, 255, 255, 0.78) !important; }
  .masthead .eyebrow { color: var(--gold) !important; }
  .meta {
    color: rgba(255, 255, 255, 0.65) !important;
    border-top-color: rgba(255, 255, 255, 0.25) !important;
    margin-top: 0.3rem;
    padding-top: 0.85rem;
  }
  .meta b { color: #fff !important; }

  .panel { padding: 1rem; gap: 0.35rem; }
  .flag, .note { padding: 0.85rem 1.1rem; gap: 0.35rem; }
  .layer { padding: 0.55rem 0.9rem; }
  .stack { gap: 0.35rem; }
  .grid { gap: 0.75rem; }
  ul { gap: 0.25rem; }
  .checks { gap: 0.3rem; }
  th, td { padding: 0.42rem 0.9rem 0.42rem 0; }
  table { min-width: 0; }

  /* Long sections flow across pages; headings never strand, and a row, panel
     or callout never splits across the fold. */
  section { break-inside: auto; }
  h2, h3 { break-after: avoid; }
  thead { display: table-header-group; }
  tr, .panel, .flag, .note, .layer, footer { break-inside: avoid; }
  .grid { break-inside: auto; }

  a { color: var(--ink) !important; text-decoration: none; }
}
`;

const chrome = CHROME_CANDIDATES.find((path) => {
  return spawnSync("test", ["-x", path]).status === 0;
});

if (!chrome) {
  console.error(
    "Could not find Chrome. Set CHROME=/path/to/chrome and run again.",
  );
  process.exit(1);
}

const fragment = readFileSync(source, "utf8");

/* data-theme="light" is pinned so the PDF never picks up a dark-mode palette
   from the machine that happens to render it. */
const document = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${printCss}</style>
</head>
<body>
${fragment}
</body>
</html>
`;

const scratch = mkdtempSync(join(tmpdir(), "plan-pdf-"));
const page = join(scratch, "print.html");

try {
  writeFileSync(page, document, "utf8");

  const result = spawnSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--virtual-time-budget=6000",
      `--print-to-pdf=${output}`,
      `file://${page}`,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || "Chrome failed to render the PDF.");
    process.exit(1);
  }

  console.log(`Wrote ${output}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
