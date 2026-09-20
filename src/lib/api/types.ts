/**
 * The slice of the API's responses this app needs.
 *
 * The public site only ever creates a booking or a quote and looks one up by
 * reference and phone — it has no business knowing the shape of a customer
 * record. The admin app keeps its own, fuller copy in
 * `admin/src/lib/api/types.ts`; if a field here changes, it changes there and
 * in `api/src/services/` too.
 */

export type BookingStatus =
  | "new"
  | "quoted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "pending";

export type TripType = "airport" | "point-to-point" | "hourly";

/**
 * How a trip is priced.
 *
 * `fixed` — an airport transfer inside New York City matching a published rate.
 * `quote` — everything else; a person sets the price afterwards.
 */
export type PricingMode = "fixed" | "quote";

/* -------------------------------------------------------------------------- */
/* Booking                                                                    */
/* -------------------------------------------------------------------------- */

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

export type Airport = { code: string; name: string };

export type PublishedRate = {
  airportCode: string;
  vehicleSlug: string;
  priceCents: number;
};

/** What the booking form needs to preview a fare before submission. */
export type BookingOptions = {
  airports: Airport[];
  rates: PublishedRate[];
  /** False when no Google key is configured; the address field degrades. */
  placesEnabled: boolean;
  childSeatFeeCents: number;
};

/** What /track returns. Still no customer contact details. */
export type TrackedBooking = {
  reference: string;
  status: BookingStatus;
  pricingMode: PricingMode;
  pickupAt: string;
  pickup: string;
  destination: string;
  vehicleClass: string;
  quotedTotalCents: number | null;
  quoteNote: string | null;
  quotedAt: string | null;
};

/* -------------------------------------------------------------------------- */
/* Fleet                                                                      */
/* -------------------------------------------------------------------------- */

/** The homepage hero's background media, as `/api/hero` exposes it. */
export type HeroMediaItem = {
  id: number;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  altText: string;
  width: number | null;
  height: number | null;
};

export type VehiclePhoto = {
  id: number;
  url: string;
  kind: "exterior" | "interior";
  altText: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  displayOrder: number;
};

/**
 * What `/api/fleet` exposes. Note the absences: no id, no `isActive`, no
 * timestamps. A hidden vehicle never reaches this shape at all.
 */
export type FleetVehicle = {
  slug: string;
  name: string;
  category: "sedan" | "suv" | "premium-suv" | "van" | "sprinter";
  model: string | null;
  passengerCapacity: number;
  luggageCapacity: number;
  maxChildSeats: number;
  baseFareCents: number;
  bestFor: string;
  detail: string;
  amenities: { key: string; label: string; hint?: string }[];
  photos: VehiclePhoto[];
  primaryPhoto: VehiclePhoto | null;
};

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export type PublicReview = {
  id: number;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
};

export type ReviewsResponse = {
  reviews: PublicReview[];
  count: number;
  average: number | null;
  /** Google's review form for the business, or null until a Place ID is set. */
  googleReviewUrl: string | null;
};
