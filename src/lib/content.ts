/**
 * Service, fleet and package copy transcribed from the Brand Guidelines,
 * Edition 02, 2026 (Chapters 6 and 10). Keep edits in-voice: short sentences,
 * no filler, no exclamation points.
 */

/**
 * Every way to reach the business, in one place.
 *
 * These are live details, not placeholders — the number rings and the mailbox
 * is read. They were once typed into five separate components; keeping them
 * here means a change to either is one edit rather than a search.
 *
 * `phone` and `phoneHref` are two fields on purpose and must move together:
 * the display form carries the formatting a person reads, the href carries the
 * E.164 form a phone dials.
 *
 * There is one address, not a set of departmental ones. `weddings@` and
 * `corporate@` used to sit here and neither mailbox existed, so an enquiry sent
 * to either would have bounced.
 */
export const contact = {
  phone: "+1 (914) 338-6414",
  phoneHref: "tel:+19143386414",
  /**
   * The brief is explicit: do not offer texting unless texts are monitored.
   * Flip `smsEnabled` to true only once someone is actually reading them, and
   * the TEXT US affordances appear.
   */
  smsHref: "sms:+19143386414",
  smsEnabled: false,
  email: "rsskylerlimo@yahoo.com",
  serviceArea: "All five boroughs of New York City",
} as const;

/**
 * One set of labels. The bar only shows this menu from `xl`, where every label
 * fits at full length; below that the burger panel shows the same wording. An
 * abbreviated set existed for an intermediate breakpoint that no longer has a
 * horizontal menu to abbreviate.
 */
export const nav = [
  { href: "/fleet", label: "Fleet" },
  { href: "/corporate", label: "Corporate" },
  { href: "/weddings", label: "Weddings & Events" },
  { href: "/quote", label: "Get a quote" },
  { href: "/track", label: "Track a ride" },
] as const;

/**
 * The fleet used to be hardcoded here. It now lives in the `vehicles` table and
 * is served by `GET /api/fleet`, so the operator can add a class without a
 * deploy — see `src/lib/public/fleet.ts`. Nothing in this file should describe
 * a vehicle again; two lists would disagree the first time a car changed.
 */

export type Service = {
  name: string;
  description: string;
  href: string;
};

/**
 * `href` must land on a page that actually describes the service. Three of
 * these used to point at `/fleet`, so "Airport Transfers" opened a page about
 * cars. Until the dedicated service pages exist, airport and hourly work point
 * at the booking form, which is the thing a visitor clicking them wants.
 */
export const services: Service[] = [
  {
    name: "Airport Transfers",
    description:
      "JFK, LaGuardia, Newark, Teterboro and Westchester. Fixed fares within the five boroughs, published before you book.",
    href: "/#book",
  },
  {
    name: "Hourly Charters",
    description:
      "A car and driver on standby for meetings, appointments, or a day that will not hold still.",
    href: "/#book",
  },
  {
    name: "Corporate Accounts",
    description:
      "Monthly billing and a named contact for company travel programmes.",
    href: "/corporate",
  },
  {
    name: "Events",
    description:
      "Coordinated multi-vehicle logistics for conferences, galas and private functions.",
    href: "/weddings",
  },
  {
    name: "Weddings",
    description:
      "A dedicated division, its own coordinators, and a timeline agreed before the day.",
    href: "/weddings",
  },
];

export const values = [
  {
    title: "Punctuality as respect",
    body: "On time is not a metric here — it is how we show we value your time as much as our own.",
  },
  {
    title: "Discretion by default",
    body: "Conversations, routes and client details stay in the car. Nothing is assumed to be shareable.",
  },
  {
    title: "Craft in the details",
    body: "A clean interior, a correct temperature, a driver who already knows the terminal.",
  },
  {
    title: "One standard, every borough",
    body: "Manhattan, Brooklyn, Queens, the Bronx and Staten Island are run to the same bar.",
  },
];

export type WeddingPackage = {
  tier: string;
  summary: string;
  includes: string[];
};

export const weddingPackages: WeddingPackage[] = [
  {
    tier: "Classic",
    summary: "One vehicle, half a day, handled properly.",
    includes: [
      "One Luxury Sedan or Luxury SUV for the couple",
      "Half-day booking",
      "Route walked in advance",
      "Decorated ribbon on request",
    ],
  },
  {
    tier: "Signature",
    summary: "The couple and the party, on one timeline.",
    includes: [
      "Couple's vehicle plus a Sprinter Van for the wedding party",
      "Full-day booking",
      "Dedicated on-site coordinator",
      "Rehearsed timings with your planner",
    ],
  },
  {
    tier: "Bespoke",
    summary: "A full motorcade, across as many days as it takes.",
    includes: [
      "Full motorcade across multiple vehicle classes",
      "Multi-day availability for pre-wedding events",
      "A named coordinator from first call to final drop-off",
      "Guest transport and shuttle planning",
    ],
  },
];

/**
 * Only capabilities that exist today.
 *
 * Service level agreements, saved traveller profiles, duty-of-care reporting
 * and live tracking links were listed here and none of them are built. The
 * brief is explicit — do not advertise what the company does not provide — so
 * they are gone rather than softened. Restore any of them the day the thing
 * behind it actually ships.
 */
export const corporateFeatures = [
  {
    title: "Monthly invoicing",
    body: "One consolidated invoice at the end of the month, with every trip itemised, rather than a receipt per journey.",
  },
  {
    title: "A single point of contact",
    body: "One named account manager who knows your travel patterns, not a rotating queue.",
  },
  {
    title: "Assistant-friendly booking",
    body: "Book on behalf of anyone in your organisation. The confirmation goes to the traveller, not only to whoever made the arrangements.",
  },
  {
    title: "Fixed airport fares",
    body: "Transfers between the five boroughs and the New York airports are priced from a published rate card, so a finance team can check a trip against it.",
  },
  {
    title: "Priced before you travel",
    body: "Anything outside the rate card is quoted by a person and agreed in writing first. No trip is invoiced at a figure nobody saw coming.",
  },
  {
    title: "A reference on every trip",
    body: "Each booking carries a reference your travellers can quote back to you, and look up themselves with the number on the booking.",
  },
];

export const airports = ["JFK", "LaGuardia (LGA)", "Newark (EWR)"] as const;

/**
 * Published rates. These appear in the terms and on invoices, so a customer can
 * check one against the other — keep them here rather than typed into a page.
 */

/** Waiting past the complimentary window, in whole dollars per hour. */
export const hourlyWaitingRate = 70;

/**
 * Per child seat. How many a given class can take is a property of the vehicle
 * (`maxChildSeats` on the vehicle record), not a site-wide constant — a sedan
 * fits one, an SUV two.
 */
export const childSeatFee = 35;

/**
 * Every airport the booking form offers, including the two private-aviation
 * fields the marketing pages do not lead with. A flight number is required for
 * all of them.
 */
export const bookingAirports = [
  "JFK",
  "LaGuardia (LGA)",
  "Newark (EWR)",
  "Teterboro (TEB)",
  "Westchester County (HPN)",
] as const;
