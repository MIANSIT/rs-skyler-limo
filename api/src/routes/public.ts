import { Router } from "express";

import { ApiError } from "../lib/http.js";
import { samePhone } from "../lib/phone.js";
import { isReference } from "../lib/reference.js";
import { rateLimit } from "../middleware.js";
import {
  createBookingSchema,
  createQuoteSchema,
  placesAutocompleteSchema,
  trackSchema,
} from "../schemas.js";
import { createBooking, getBookingByReference } from "../services/bookings.js";
import { createQuote } from "../services/quotes.js";
import { listVehicles } from "../services/vehicles.js";
import { decideFare, getPublicRates, AIRPORTS } from "../services/pricing.js";
import { autocomplete, placesAvailable } from "../services/places.js";
import { randomUUID } from "node:crypto";

export const publicRouter: Router = Router();

// Generous enough that a customer correcting a typo is never blocked, tight
// enough that a script cannot fill the dashboard with noise overnight.
const submitLimit = rateLimit({ windowMs: 60_000, max: 8 });
const lookupLimit = rateLimit({ windowMs: 60_000, max: 30 });

/**
 * Kept beside the fare logic rather than in the site's content file: this
 * number is charged, so it belongs where the charging happens.
 */
const CHILD_SEAT_FEE_CENTS = 3500;

/**
 * The fleet as the public site shows it: active vehicles only, in the
 * operator's chosen order. A hidden vehicle is invisible here the moment it is
 * hidden, which is what makes "only show vehicles actually available" true
 * rather than aspirational.
 */
publicRouter.get("/fleet", async (_req, res) => {
  const vehicles = await listVehicles({ includeInactive: false });

  res.json({
    vehicles: vehicles.map((vehicle) => ({
      slug: vehicle.slug,
      name: vehicle.name,
      category: vehicle.category,
      model: vehicle.model,
      passengerCapacity: vehicle.passengerCapacity,
      luggageCapacity: vehicle.luggageCapacity,
      maxChildSeats: vehicle.maxChildSeats,
      baseFareCents: vehicle.baseFareCents,
      bestFor: vehicle.bestFor,
      detail: vehicle.detail,
      amenities: vehicle.amenityLabels,
      photos: vehicle.photos,
      primaryPhoto: vehicle.primaryPhoto,
    })),
  });
});

/**
 * What the booking form needs to preview a fare: the airports, the published
 * rates, and whether address autocomplete is available at all.
 */
publicRouter.get("/booking-options", async (_req, res) => {
  res.json({
    airports: AIRPORTS,
    rates: await getPublicRates(),
    placesEnabled: placesAvailable(),
    childSeatFeeCents: CHILD_SEAT_FEE_CENTS,
  });
});

const placesLimit = rateLimit({ windowMs: 60_000, max: 60 });

publicRouter.get("/places/autocomplete", placesLimit, async (req, res) => {
  if (!placesAvailable()) {
    res.json({ suggestions: [], available: false });
    return;
  }

  const { q, session } = placesAutocompleteSchema.parse(req.query);
  res.json({ suggestions: await autocomplete(q, session), available: true });
});

publicRouter.post("/bookings", submitLimit, async (req, res) => {
  const input = createBookingSchema.parse(req.body);

  /**
   * The fare is decided here, not accepted from the request.
   *
   * The form previews a price so the customer is not booking blind, but that
   * number never travels back — this re-runs the decision against the live rate
   * card. A stale tab, an edited payload or a rate the operator changed one
   * minute ago all resolve to the price the business actually publishes now.
   */
  const fare = await decideFare({
    tripType: input.tripType,
    vehicleClass: input.vehicleClass,
    airportCode: input.airportCode,
    airportDirection: input.airportDirection,
    childSeats: input.childSeats,
    childSeatFeeCents: CHILD_SEAT_FEE_CENTS,
    pickupPlaceId: input.pickupPlaceId,
    destinationPlaceId: input.destinationPlaceId,
    statedBorough: input.statedBorough,
    sessionToken: input.placesSessionToken ?? randomUUID(),
  });

  const booking = await createBooking(input, "website", fare);

  res.status(201).json({
    reference: booking.reference,
    pricingMode: booking.pricingMode,
    quotedTotalCents: booking.quotedTotalCents,
    fareReason: fare.reason,
  });
});

publicRouter.post("/quotes", submitLimit, async (req, res) => {
  const input = createQuoteSchema.parse(req.body);
  const quote = await createQuote(input, "website");

  res.status(201).json({
    reference: quote.reference,
    status: quote.status,
  });
});

/**
 * Look up a booking with its reference *and* the phone number on it.
 *
 * The reference alone used to be enough. It is 35 bits of randomness, which is
 * not guessable in bulk, but it also travels in email, in text messages and on
 * paper — and it would otherwise expose a customer's name, route and times to
 * anyone who read one over a shoulder. Two factors, neither of them secret
 * alone.
 */
publicRouter.post("/track", lookupLimit, async (req, res) => {
  const { reference, phone } = trackSchema.parse(req.body);

  if (!isReference(reference.toUpperCase())) {
    throw ApiError.notFound("No booking matches those details.");
  }

  const booking = await getBookingByReference(reference);

  const matches = booking && samePhone(booking.customerPhone, phone);

  // One message for "no such reference" and for "wrong phone", so this cannot
  // be used to test whether a reference exists.
  if (!matches) throw ApiError.notFound("No booking matches those details.");

  res.json({
    reference: booking.reference,
    status: booking.status,
    pricingMode: booking.pricingMode,
    pickupAt: booking.pickupAt,
    pickup: booking.pickup,
    destination: booking.destination,
    vehicleClass: booking.vehicleClass,
    quotedTotalCents: booking.quotedTotalCents,
    quoteNote: booking.quoteNote,
    quotedAt: booking.quotedAt,
  });
});
