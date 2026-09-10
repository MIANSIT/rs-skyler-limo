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
