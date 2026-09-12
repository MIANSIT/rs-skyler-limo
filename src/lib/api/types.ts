/**
 * The slice of the API's responses this app needs.
 *
 * The public site only ever creates a booking or a quote and looks one up by
 * reference — it has no business knowing the shape of a customer record. The
 * admin app keeps its own, fuller copy in `admin/src/lib/api/types.ts`; if a
 * field here changes, it changes there and in `api/src/services/` too.
 */

export type BookingStatus =
  | "new"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "pending";

export type TripType = "airport" | "point-to-point" | "hourly";

/** What /track is allowed to know — deliberately no customer contact details. */
export type TrackedBooking = {
  reference: string;
  status: BookingStatus;
  pickupAt: string;
  pickup: string;
  destination: string;
  vehicleClass: string;
};

/* -------------------------------------------------------------------------- */
/* Fleet                                                                      */
/* -------------------------------------------------------------------------- */

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
