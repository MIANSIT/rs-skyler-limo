/**
 * Service, fleet and package copy transcribed from the Brand Guidelines,
 * Edition 02, 2026 (Chapters 6 and 10). Keep edits in-voice: short sentences,
 * no filler, no exclamation points.
 */

export const nav = [
  { href: "/fleet", label: "Fleet" },
  { href: "/corporate", label: "Corporate" },
  { href: "/weddings", label: "Weddings & Events" },
  { href: "/track", label: "Track a ride" },
] as const;

export type VehicleClass = {
  slug: string;
  name: string;
  passengers: string;
  luggage: string;
  bestFor: string;
  from: string;
  detail: string;
};

export const fleet: VehicleClass[] = [
  {
    slug: "luxury-sedan",
    name: "Luxury Sedan",
    passengers: "Up to 3",
    luggage: "2 large cases",
    bestFor:
      "Individual and two-passenger travel — airport transfers, point-to-point, executive pickups.",
    from: "$95",
    detail:
      "The default choice for a 6 a.m. run to JFK or a meeting across town. Quiet cabin, bottled water, a driver who already knows the terminal.",
  },
  {
    slug: "luxury-suv",
    name: "Luxury SUV",
    passengers: "Up to 5",
    luggage: "4 large cases",
    bestFor:
      "Small groups and extra luggage, without stepping up to a full premium class.",
    from: "$135",
    detail:
      "Room for a family arriving on an international flight, or three colleagues and their carry-ons, at a fare that stays sensible.",
  },
  {
    slug: "premium-suv",
    name: "Premium SUV",
    passengers: "Up to 5",
    luggage: "4 large cases",
    bestFor:
      "The top of the fleet — VIP, diplomatic and flagship corporate bookings.",
    from: "$185",
    detail:
      "Reserved for the bookings where the vehicle itself is part of the impression. Vetted drivers, consistent assignment on repeat travel.",
  },
  {
    slug: "sprinter-van",
    name: "Sprinter Van",
    passengers: "Up to 14",
    luggage: "12 large cases",
    bestFor: "Group transport, wedding parties, and event logistics.",
    from: "$240",
    detail:
      "One vehicle instead of three cars that arrive four minutes apart. The backbone of the wedding and events division.",
  },
];

export type Service = {
  name: string;
  description: string;
  href: string;
};

export const services: Service[] = [
  {
    name: "Airport Transfers",
    description:
      "Flight-tracked pickup and drop-off across JFK, LaGuardia and Newark. If your flight moves, your pickup moves with it.",
    href: "/fleet",
  },
  {
    name: "Hourly Charters",
    description:
      "A car and driver on standby for meetings, appointments, or a day that will not hold still.",
    href: "/fleet",
  },
  {
    name: "Corporate Accounts",
    description:
      "Monthly billing, SLAs and a dedicated contact for company travel programs.",
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
      "A dedicated division, its own coordinators, and a timeline rehearsed before the day.",
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

export const corporateFeatures = [
  {
    title: "Monthly invoicing",
    body: "One consolidated invoice with tabular figures, cost centres, and per-trip detail your finance team can reconcile without calling us.",
  },
  {
    title: "Service level agreements",
    body: "Written response and arrival commitments, agreed at account setup rather than assumed.",
  },
  {
    title: "A single point of contact",
    body: "One named account manager who knows your travel patterns, not a rotating queue.",
  },
  {
    title: "Assistant-friendly booking",
    body: "Book on behalf of anyone in your organisation. Travellers get their own confirmations and live tracking link.",
  },
  {
    title: "Saved traveller profiles",
    body: "Preferred vehicle class, temperature and route notes remembered across bookings.",
  },
  {
    title: "Duty-of-care reporting",
    body: "Know where your travellers are, and export the record when procurement asks for it.",
  },
];

export const airports = ["JFK", "LaGuardia (LGA)", "Newark (EWR)"] as const;

/**
 * Published rates. These appear in the terms and on invoices, so a customer can
 * check one against the other — keep them here rather than typed into a page.
 */

/** Waiting past the complimentary window, in whole dollars per hour. */
export const hourlyWaitingRate = 70;

/** Per child seat, up to `maxChildSeats` per vehicle. */
export const childSeatFee = 35;
export const maxChildSeats = 2;

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
