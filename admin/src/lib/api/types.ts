/**
 * The shapes the API returns. Kept as plain types rather than imported from
 * `api/` so the site builds without the API's node_modules — the two apps
 * deploy as separate units. If a field moves here, it moves in
 * `api/src/services/` too.
 */

export const bookingStatuses = [
  "new",
  /** Priced by an operator, awaiting the customer's yes. Quote requests only. */
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
  "pending",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export const quoteStatuses = [
  "new",
  "quoted",
  "won",
  "lost",
  "pending",
] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];

export type TripType = "airport" | "point-to-point" | "hourly";

export type Booking = {
  id: number;
  reference: string;
  status: BookingStatus;
  tripType: TripType;
  pickup: string;
  destination: string;
  pickupAt: string;
  passengers: number;
  bags: number;
  childSeats: number;
  vehicleClass: string;
  /** The occasion. Distinct from tripType, which is the shape of the journey. */
  serviceType: "personal" | "corporate" | "wedding" | "event" | "other";
  pricingMode: "fixed" | "quote";
  quotedAt: string | null;
  quoteNote: string | null;
  pickupLocality: string | null;
  pickupRegion: string | null;
  destinationLocality: string | null;
  destinationRegion: string | null;
  airportCode: string | null;
  airportDirection: "from-airport" | "to-airport" | null;
  airline: string | null;
  flightNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string | null;
  quotedTotalCents: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Other live bookings for the same vehicle class within three hours. Only on
   * the list endpoint; the detail page gets the bookings themselves.
   */
  possibleClashes?: number;
};

/** Another booking that may need the same car. An operator aid, never a block. */
export type PossibleClash = {
  id: number;
  reference: string;
  status: string;
  pickupAt: string;
  customerName: string;
};

export type Quote = {
  id: number;
  reference: string;
  status: QuoteStatus;
  serviceType: "corporate" | "wedding" | "event" | "hourly" | "other";
  eventDate: string | null;
  passengers: number | null;
  company: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  details: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityEntry = {
  id: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string | null;
  createdAt: string;
};

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: "owner" | "dispatcher";
};

export type DashboardStats = {
  bookings: {
    new: number;
    confirmed: number;
    today: number;
    next7Days: number;
    total: number;
  };
  quotes: { new: number; total: number };
  recentVolume: { date: string; count: number }[];
};

export type Paginated<K extends string, T> = {
  total: number;
  page: number;
  perPage: number;
} & Record<K, T[]>;

/* -------------------------------------------------------------------------- */
/* Fleet                                                                      */
/* -------------------------------------------------------------------------- */

export const vehicleCategories = [
  "sedan",
  "suv",
  "premium-suv",
  "van",
  "sprinter",
] as const;

export type VehicleCategory = (typeof vehicleCategories)[number];

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

/** A slide in the homepage hero's background media. */
export type HeroMediaItem = {
  id: number;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  altText: string;
  width: number | null;
  height: number | null;
  isActive: boolean;
  displayOrder: number;
};

export type Amenity = { key: string; label: string; hint?: string };

export type Vehicle = {
  id: number;
  slug: string;
  name: string;
  category: VehicleCategory;
  model: string | null;
  passengerCapacity: number;
  luggageCapacity: number;
  maxChildSeats: number;
  baseFareCents: number;
  bestFor: string;
  detail: string;
  amenities: string[];
  amenityLabels: Amenity[];
  isActive: boolean;
  displayOrder: number;
  photos: VehiclePhoto[];
  primaryPhoto: VehiclePhoto | null;
  createdAt: string;
  updatedAt: string;
};

export type FleetMeta = {
  amenities: Amenity[];
  categories: readonly VehicleCategory[];
};

/* -------------------------------------------------------------------------- */
/* Airport rate card                                                          */
/* -------------------------------------------------------------------------- */

export type Airport = { code: string; name: string };

/** An airport as the operator manages it, with what depends on it. */
export type AdminAirport = Airport & {
  isActive: boolean;
  displayOrder: number;
  rateCount: number;
  bookingCount: number;
};

export type AirportRate = {
  airportCode: string;
  vehicleId: number;
  vehicleSlug: string;
  vehicleName: string;
  priceCents: number;
  isActive: boolean;
  updatedAt: string | null;
};

export type RateGrid = {
  airports: Airport[];
  vehicles: { id: number; slug: string; name: string }[];
  rates: AirportRate[];
};

/* -------------------------------------------------------------------------- */
/* Regional reference rates — not read by the booking engine, see AGENTS.md   */
/* -------------------------------------------------------------------------- */

export type Zone = { key: string; label: string };

export type ZoneRate = {
  airportCode: string;
  zoneKey: string;
  vehicleId: number;
  vehicleSlug: string;
  vehicleName: string;
  priceCents: number;
  updatedAt: string | null;
};

export type ZoneRateGrid = {
  airports: Airport[];
  vehicles: { id: number; slug: string; name: string }[];
  zones: Zone[];
  rates: ZoneRate[];
};

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export type ReviewStatus = "pending" | "approved" | "hidden";

export type AdminReview = {
  id: number;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
  status: ReviewStatus;
  bookingReference: string;
};
