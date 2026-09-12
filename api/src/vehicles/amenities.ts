/**
 * The closed vocabulary of vehicle amenities.
 *
 * Closed on purpose. The requirement doc is emphatic that the site must not
 * advertise anything the company does not actually provide, and free-text
 * amenities are how "complimentary champagne" ends up on a card nobody
 * authorised. Adding one is a code change and therefore a review.
 *
 * `key` is what the database stores; `label` is what a customer reads. Keep the
 * labels plain — no exclamation points, no adjectives doing sales work.
 */
export type Amenity = {
  key: string;
  label: string;
  /** Shown under the label where the amenity needs a sentence to be honest. */
  hint?: string;
};

export const AMENITIES = [
  {
    key: "meet-and-greet",
    label: "Meet & greet",
    hint: "Chauffeur waits inside arrivals with a name board.",
  },
  {
    key: "flight-tracking",
    label: "Flight tracking",
    hint: "Pickup moves with the flight, using the flight number on the booking.",
  },
  {
    key: "luggage-assistance",
    label: "Luggage assistance",
    hint: "Cases loaded and unloaded by the chauffeur.",
  },
  { key: "child-seat", label: "Child seat available", hint: "Fitted on request." },
  { key: "bottled-water", label: "Bottled water" },
  { key: "phone-charger", label: "Phone chargers" },
  { key: "wifi", label: "On-board Wi-Fi" },
  { key: "climate-control", label: "Rear climate control" },
  { key: "leather-interior", label: "Leather interior" },
  { key: "privacy-partition", label: "Privacy partition" },
  { key: "extra-legroom", label: "Extra legroom" },
  { key: "wheelchair-accessible", label: "Wheelchair accessible" },
  { key: "multiple-stops", label: "Multiple stops" },
  { key: "hourly-available", label: "Available hourly" },
] as const satisfies readonly Amenity[];

export type AmenityKey = (typeof AMENITIES)[number]["key"];

export const AMENITY_KEYS = AMENITIES.map((a) => a.key) as [
  AmenityKey,
  ...AmenityKey[],
];

export function isAmenityKey(value: unknown): value is AmenityKey {
  return (
    typeof value === "string" && AMENITY_KEYS.includes(value as AmenityKey)
  );
}

export const VEHICLE_CATEGORIES = [
  "sedan",
  "suv",
  "premium-suv",
  "van",
  "sprinter",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];
