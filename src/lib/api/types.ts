/**
 * The shapes the API returns. Kept as plain types rather than imported from
 * `api/` so the site builds without the API's node_modules — the two apps
 * deploy as separate units. If a field moves here, it moves in
 * `api/src/services/` too.
 */

export const bookingStatuses = [
  "new",
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
  vehicleClass: string;
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

/** What /track is allowed to know — no customer contact details. */
export type TrackedBooking = {
  reference: string;
  status: BookingStatus;
  pickupAt: string;
  pickup: string;
  destination: string;
  vehicleClass: string;
};
