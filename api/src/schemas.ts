import { z } from "zod";

/**
 * The contract between the public site, the admin panel and the database.
 * Anything not declared here is dropped before it reaches SQL.
 */

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const bookingStatuses = [
  "new",
  "confirmed",
  "completed",
  "cancelled",
  "pending",
] as const;

export const quoteStatuses = [
  "new",
  "quoted",
  "won",
  "lost",
  "pending",
] as const;

export const tripTypes = ["airport", "point-to-point", "hourly"] as const;

export const serviceTypes = [
  "corporate",
  "wedding",
  "event",
  "hourly",
  "other",
] as const;

/** Loose on purpose: New York numbers arrive in a dozen shapes and the operator
 *  calls the customer back regardless. Reject only what is clearly not a number. */
const phone = z
  .string()
  .trim()
  .min(7, "Enter a contact number.")
  .max(40)
  .regex(/^[0-9+()\-.\s]+$/, "Enter a contact number.");

export const createBookingSchema = z.object({
  tripType: z.enum(tripTypes),
  pickup: trimmed(255),
  destination: trimmed(255),
  /** ISO 8601. The site sends a local date and time; it is converted before send. */
  pickupAt: z.iso.datetime({ offset: true }),
  passengers: z.coerce.number().int().min(1).max(60).default(1),
  bags: z.coerce.number().int().min(0).max(60).default(0),
  vehicleClass: trimmed(60),
  airline: z.string().trim().max(120).optional().nullable(),
  flightNumber: z.string().trim().max(20).optional().nullable(),
  customerName: trimmed(160),
  customerEmail: z.email().max(255),
  customerPhone: phone,
  notes: z.string().trim().max(5000).optional().nullable(),
  quotedTotalCents: z.coerce.number().int().min(0).max(100_000_00).optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const createQuoteSchema = z.object({
  serviceType: z.enum(serviceTypes),
  eventDate: z.iso.date().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(500).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  customerName: trimmed(160),
  customerEmail: z.email().max(255),
  customerPhone: phone,
  details: trimmed(5000),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateBookingSchema = z
  .object({
    status: z.enum(bookingStatuses).optional(),
    note: z.string().trim().max(2000).optional(),
    pickupAt: z.iso.datetime({ offset: true }).optional(),
    vehicleClass: trimmed(60).optional(),
    quotedTotalCents: z.coerce.number().int().min(0).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Nothing to update.",
  });

export const updateQuoteSchema = z
  .object({
    status: z.enum(quoteStatuses).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Nothing to update.",
  });

export const listBookingsSchema = z.object({
  status: z.enum(bookingStatuses).optional(),
  /** Matches reference, customer name, email, phone, pickup or destination. */
  q: z.string().trim().max(120).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export const listQuotesSchema = z.object({
  status: z.enum(quoteStatuses).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(200),
});
