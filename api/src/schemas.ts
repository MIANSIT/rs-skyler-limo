import { z } from "zod";

import { AIRPORT_CODES } from "./services/pricing.js";
import { AMENITY_KEYS, VEHICLE_CATEGORIES } from "./vehicles/amenities.js";

/**
 * The contract between the public site, the admin panel and the database.
 * Anything not declared here is dropped before it reaches SQL.
 */

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const bookingStatuses = [
  "new",
  "quoted",
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

/**
 * The occasion behind a booking. Distinct from `tripTypes`, which describes the
 * shape of the journey — an airport run can be corporate or personal, and the
 * two reach different people in the business.
 */
export const bookingServiceTypes = [
  "personal",
  "corporate",
  "wedding",
  "event",
  "other",
] as const;

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
  /** Capped against the chosen vehicle's `maxChildSeats` by the booking form. */
  childSeats: z.coerce.number().int().min(0).max(4).default(0),
  vehicleClass: trimmed(60),
  /** Defaulted rather than required: an older client that omits it still books. */
  serviceType: z.enum(bookingServiceTypes).default("personal"),

  /* Airport transfers carry the airport, the direction, and the Place ids the
     server re-resolves. The customer never sends a price — `decideFare` derives
     it from the live rate card. */
  airportCode: z.enum(AIRPORT_CODES).optional().nullable(),
  airportDirection: z.enum(["from-airport", "to-airport"]).optional().nullable(),
  pickupPlaceId: z.string().trim().max(255).optional().nullable(),
  destinationPlaceId: z.string().trim().max(255).optional().nullable(),
  /** Used only when Places is unavailable and the customer picked a borough. */
  statedBorough: z.string().trim().max(60).optional().nullable(),
  /** Ties the autocomplete keystrokes and the details call into one billed session. */
  placesSessionToken: z.string().trim().max(120).optional().nullable(),

  airline: z.string().trim().max(120).optional().nullable(),
  flightNumber: z.string().trim().max(20).optional().nullable(),
  customerName: trimmed(160),
  customerEmail: z.email().max(255),
  customerPhone: phone,
  notes: z.string().trim().max(5000).optional().nullable(),
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

export const sendQuoteSchema = z.object({
  /** Whole dollars from the operator's form, converted before it arrives. */
  totalCents: z.coerce.number().int().min(0).max(100_000_00),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const saveRatesSchema = z.object({
  rates: z
    .array(
      z.object({
        airportCode: z.enum(AIRPORT_CODES),
        vehicleId: z.coerce.number().int().positive(),
        /** `null` clears the cell, so that combination quotes instead. */
        priceCents: z.coerce.number().int().min(0).max(100_000_00).nullable(),
      }),
    )
    .max(200),
});

export const trackSchema = z.object({
  reference: z.string().trim().min(3).max(20),
  /** Second factor: a reference alone should not reveal a trip. */
  phone: z.string().trim().min(4).max(40),
});

export const placesAutocompleteSchema = z.object({
  q: z.string().trim().min(1).max(200),
  session: z.string().trim().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(200),
});

/* -------------------------------------------------------------------------- */
/* Fleet                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Lowercase, hyphenated, no leading or trailing hyphen. Slugs end up in URLs
 * and are stored on every booking, so they are validated rather than generated
 * silently from the name — a rename must not quietly orphan past bookings.
 */
const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens.",
  );

export const vehicleInputSchema = z.object({
  slug,
  name: trimmed(120),
  category: z.enum(VEHICLE_CATEGORIES),
  model: z.string().trim().max(160).optional().nullable(),
  passengerCapacity: z.coerce.number().int().min(1).max(60),
  luggageCapacity: z.coerce.number().int().min(0).max(60),
  maxChildSeats: z.coerce.number().int().min(0).max(4).default(0),
  baseFareCents: z.coerce.number().int().min(0).max(100_000_00),
  bestFor: trimmed(500),
  detail: trimmed(5000),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length).default([]),
  isActive: z.coerce.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

/** Every field optional, but at least one present. */
export const vehicleUpdateSchema = vehicleInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: "Nothing to update.",
  });

export const listVehiclesSchema = z.object({
  /** Admin only; the public endpoint always filters to active. */
  includeInactive: z.coerce.boolean().default(false),
  q: z.string().trim().max(120).optional(),
});

export const photoMetaSchema = z.object({
  kind: z.enum(["exterior", "interior"]).default("exterior"),
  /** §38 wants alt text on every image, so it is required at the door. */
  altText: trimmed(255),
  isPrimary: z.coerce.boolean().default(false),
});

export const photoUpdateSchema = z
  .object({
    kind: z.enum(["exterior", "interior"]).optional(),
    altText: trimmed(255).optional(),
    isPrimary: z.coerce.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Nothing to update.",
  });

export const reorderSchema = z.object({
  /** Vehicle ids in the order they should appear. */
  ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export const heroMediaMetaSchema = z.object({
  kind: z.enum(["image", "video"]).default("image"),
  altText: trimmed(255),
});

export const heroMediaUpdateSchema = z
  .object({
    altText: trimmed(255).optional(),
    isActive: z.coerce.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "Nothing to update.",
  });
