/**
 * "Did you mean …@gmail.com?" for the booking and quote forms.
 *
 * A mistyped address costs the customer their confirmation, their payment link
 * and the code that lets them change the booking later, so the common slips are
 * caught before submission. Only the domain is checked — the part before the @
 * is the customer's own and cannot be guessed at.
 *
 * Deliberately conservative: a domain that is itself a real provider is never
 * "corrected" (mail.com is not a typo of gmail.com), and anything not close to
 * a well-known provider is left alone. A suggestion is only ever an offer.
 */

const KNOWN_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com",
  "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com", "me.com",
  "mac.com", "aol.com", "protonmail.com", "proton.me", "mail.com", "gmx.com",
  "comcast.net", "verizon.net", "att.net", "optonline.net", "sbcglobal.net",
  "yahoo.co.uk", "hotmail.co.uk", "btinternet.com",
];

/** Misspellings too far from the real name for edit distance to catch safely. */
const KNOWN_TYPOS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
};

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/** The corrected address, or null when there is nothing worth suggesting. */
export function suggestEmail(value: string): string | null {
  const email = value.trim();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  let domain = email.slice(at + 1).toLowerCase();

  // `.con`, `.cmo`, `.comm` and friends, on any domain.
  domain = domain.replace(/\.(con|cmo|ocm|vom|xom|comm|coom|cm)$/, ".com").replace(/\.(ent|nte|nett)$/, ".net");

  if (KNOWN_TYPOS[domain]) domain = KNOWN_TYPOS[domain];

  if (!KNOWN_DOMAINS.includes(domain) && domain.length >= 6) {
    let best: string | null = null;
    let bestScore = Infinity;
    for (const known of KNOWN_DOMAINS) {
      const score = distance(domain, known);
      if (score < bestScore) {
        best = known;
        bestScore = score;
      }
    }
    if (best && bestScore <= (domain.length >= 9 ? 2 : 1)) domain = best;
  }

  const suggestion = `${local}@${domain}`;
  return suggestion.toLowerCase() === email.toLowerCase() ? null : suggestion;
}
