import { Router } from "express";

import { ApiError } from "../lib/http.js";
import { isReference } from "../lib/reference.js";
import { rateLimit } from "../middleware.js";
import { createBookingSchema, createQuoteSchema } from "../schemas.js";
import { createBooking, getBookingByReference } from "../services/bookings.js";
import { createQuote } from "../services/quotes.js";

export const publicRouter: Router = Router();

// Generous enough that a customer correcting a typo is never blocked, tight
// enough that a script cannot fill the dashboard with noise overnight.
const submitLimit = rateLimit({ windowMs: 60_000, max: 8 });
const lookupLimit = rateLimit({ windowMs: 60_000, max: 30 });

publicRouter.post("/bookings", submitLimit, async (req, res) => {
  const input = createBookingSchema.parse(req.body);
  const booking = await createBooking(input, "website");

  // The customer gets back only what they need to follow the request up.
  res.status(201).json({
    reference: booking.reference,
    status: booking.status,
    pickupAt: booking.pickupAt,
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
 * Backs /track. Deliberately thin: a reference alone proves very little, so it
 * returns only what the person holding it already knows, and never the
 * customer's contact details.
 */
publicRouter.get("/track/:reference", lookupLimit, async (req, res) => {
  const reference = String(req.params.reference).toUpperCase();
  if (!isReference(reference)) {
    throw ApiError.badRequest("That is not a valid reference.");
  }

  const booking = await getBookingByReference(reference);
  if (!booking) throw ApiError.notFound("We cannot find that reference.");

  res.json({
    reference: booking.reference,
    status: booking.status,
    pickupAt: booking.pickupAt,
    pickup: booking.pickup,
    destination: booking.destination,
    vehicleClass: booking.vehicleClass,
  });
});
