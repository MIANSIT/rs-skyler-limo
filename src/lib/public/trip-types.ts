/**
 * The three shapes of trip the booking form takes.
 *
 * A plain module rather than an export of `booking-form.tsx`: that file is a
 * Client Component, and a Server Component importing a value from it gets a
 * client reference, not the array — `/book` reads `?trip=` against this list.
 */
export type TripType = "airport" | "point-to-point" | "hourly";

export const tripTypes: { value: TripType; label: string }[] = [
  { value: "airport", label: "Airport" },
  { value: "point-to-point", label: "Point to point" },
  { value: "hourly", label: "Hourly" },
];
