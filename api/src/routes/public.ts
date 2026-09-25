import { Router } from "express";

import { env } from "../env.js";
import { ApiError } from "../lib/http.js";
import { samePhone } from "../lib/phone.js";
import { isReference } from "../lib/reference.js";
import { issueFormToken, requireFormGuard } from "../lib/form-guard.js";
import { rateLimit } from "../middleware.js";
import {
  createBookingSchema,
  createQuoteSchema,
  createReviewSchema,
  paymentConfirmSchema,
  paymentLinkSchema,
  placesAutocompleteSchema,
  trackSchema,
} from "../schemas.js";
import {
  createBooking,
  findRecentDuplicate,
  getBookingByReference,
} from "../services/bookings.js";
import { createQuote, getQuoteByReference } from "../services/quotes.js";
import {
  createReview,
  googleReviewUrl,
  listApprovedReviews,
} from "../services/reviews.js";
import { listVehicles } from "../services/vehicles.js";
import { listActiveHeroMedia } from "../services/hero.js";
import { decideFare, getPublicRates, listActiveAirports } from "../services/pricing.js";
import { autocomplete, placesAvailable } from "../services/places.js";
import { sendBookingEmails, sendQuoteRequestEmails } from "../services/mail.js";
import {
  canPayOnline,
  canPayQuoteOnline,
  createCheckout,
  createQuoteCheckout,
  recordCheckout,
} from "../services/payments.js";
import { checkPaymentLink } from "../lib/payment-link.js";
import { getVehicleBySlug } from "../services/vehicles.js";
import { titleCase } from "../emails/render.js";
import { randomUUID } from "node:crypto";

export const publicRouter: Router = Router();

// Generous enough that a customer correcting a typo is never blocked, tight
// enough that a script cannot fill the dashboard with noise overnight.
const submitLimit = rateLimit({ windowMs: 60_000, max: 8 });
const lookupLimit = rateLimit({ windowMs: 60_000, max: 30 });

/**
 * A token the forms send back with the submission. Issued when a form loads, so
 * how long the page was open can be told from the token itself.
 */
publicRouter.get("/form-token", lookupLimit, (_req, res) => {
  res.json({ token: issueFormToken() });
});

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
 * The homepage hero's background media, active slides only, in the
 * operator's chosen order. Empty when nothing has been uploaded yet — the
 * hero falls back to its plain midnight background in that case.
 */
publicRouter.get("/hero", async (_req, res) => {
  const media = await listActiveHeroMedia();

  res.json({
    media: media.map((item) => ({
      id: item.id,
      kind: item.kind,
      url: item.url,
      posterUrl: item.posterUrl,
      altText: item.altText,
      width: item.width,
      height: item.height,
    })),
  });
});

/**
 * What the booking form needs to preview a fare: the airports, the published
 * rates, and whether address autocomplete is available at all.
 */
publicRouter.get("/booking-options", async (_req, res) => {
  res.json({
    airports: await listActiveAirports(),
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

publicRouter.post("/bookings", submitLimit, requireFormGuard, async (req, res) => {
  const input = createBookingSchema.parse(req.body);

  // The same trip sent twice in ten minutes is one trip. Say so plainly rather
  // than creating a second reference and a second pair of emails.
  if (await findRecentDuplicate(input)) {
    throw ApiError.conflict(
      "We already have this booking request from you. Check your email for the reference, or call us if you did not get one.",
    );
  }

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

  /**
   * Confirmation to the customer, notification to the office.
   *
   * Deliberately not awaited. The booking is already committed, so the customer
   * has their reference whatever SMTP does next; making them wait on Yahoo
   * would add seconds to the form and turn a slow mail server into a failed
   * booking. Failures are logged by the mailer and never surface here.
   */
  void sendBookingEmails(booking).catch((error: unknown) => {
    console.error(
      `[mail] unexpected failure for ${booking.reference}:`,
      error instanceof Error ? error.message : error,
    );
  });

  /**
   * A fixed fare paid by card goes straight to Stripe. The booking is already
   * saved, so if Stripe is down the customer still has their reference and can
   * pay later from the tracking page — a payment failure is logged, never
   * returned as a failed booking.
   */
  let checkoutUrl: string | null = null;
  if (canPayOnline(booking)) {
    try {
      checkoutUrl = await createCheckout(booking);
    } catch (error) {
      console.error(
        `[stripe] could not open checkout for ${booking.reference}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  res.status(201).json({
    reference: booking.reference,
    pricingMode: booking.pricingMode,
    quotedTotalCents: booking.quotedTotalCents,
    fareReason: fare.reason,
    checkoutUrl,
  });
});

publicRouter.post("/quotes", submitLimit, requireFormGuard, async (req, res) => {
  const input = createQuoteSchema.parse(req.body);
  const quote = await createQuote(input, "website");

  // Same rule as a booking: the request is saved, so a mail failure is logged
  // and never reaches the customer, and nobody waits on SMTP.
  void sendQuoteRequestEmails(quote).catch((error: unknown) => {
    console.error(
      `[mail] unexpected failure for ${quote.reference}:`,
      error instanceof Error ? error.message : error,
    );
  });

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

  /*
   * A quote request (`RQ-…`) is looked up the same way, so every email the
   * customer gets — booking or request — can point at the one tracking page.
   * It carries no route or fare, so the response is short.
   */
  if (reference.toUpperCase().startsWith("RQ-")) {
    const quote = await getQuoteByReference(reference);
    if (!quote || !samePhone(quote.customerPhone, phone)) {
      throw ApiError.notFound("No booking matches those details.");
    }
    res.json({
      kind: "quote",
      reference: quote.reference,
      status: quote.status,
      serviceType: quote.serviceType,
      eventDate: quote.eventDate,
      agreedPriceCents: quote.agreedPriceCents,
      paymentMethod: quote.paymentMethod,
      paymentStatus: quote.paymentStatus,
      createdAt: quote.createdAt,
    });
    return;
  }

  const booking = await getBookingByReference(reference);

  const matches = booking && samePhone(booking.customerPhone, phone);

  // One message for "no such reference" and for "wrong phone", so this cannot
  // be used to test whether a reference exists.
  if (!matches) throw ApiError.notFound("No booking matches those details.");

  res.json({
    kind: "booking",
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
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    canPayOnline: canPayOnline(booking),
  });
});

/**
 * Opens a Stripe payment page for a priced, unpaid card booking. The same two
 * factors as /track, so nobody can open a payment page — or learn a fare — for
 * someone else's trip from a reference alone.
 */
publicRouter.post("/payments/checkout", lookupLimit, async (req, res) => {
  const { reference, phone } = trackSchema.parse(req.body);

  const booking = isReference(reference.toUpperCase())
    ? await getBookingByReference(reference)
    : null;
  if (!booking || !samePhone(booking.customerPhone, phone)) {
    throw ApiError.notFound("No booking matches those details.");
  }

  res.json({ url: await createCheckout(booking) });
});

/**
 * A payment link, checked. The token is the credential — signed for this
 * booking and this amount, and time-limited (`lib/payment-link.ts`) — so no
 * phone number is asked for. One vague 404 for every way a link can be wrong,
 * so it cannot be used to probe references; `expired` is said plainly because
 * only the holder of a genuine link can reach it.
 */
const EXPIRED = "This payment link has expired. Call us and we will send a new one.";
const INVALID = "This payment link is not valid. Call us and we will send a new one.";

/**
 * The booking (`RS-…`) or quote request (`RQ-…`) a payment link is for, once
 * its token checks out. The signature covers the amount, so for a quote
 * request the agreed price stands where a booking's fare would.
 */
async function payableForLink(reference: string, token: string) {
  const ref = reference.toUpperCase();
  if (!isReference(ref)) throw ApiError.notFound(INVALID);

  if (ref.startsWith("RQ-")) {
    const quote = await getQuoteByReference(ref);
    const check = quote
      ? checkPaymentLink({ id: quote.id, reference: quote.reference, quotedTotalCents: quote.agreedPriceCents }, token)
      : "invalid";
    if (!quote || check === "invalid") throw ApiError.notFound(INVALID);
    if (check === "expired") throw new ApiError(410, "link_expired", EXPIRED);
    return { kind: "quote" as const, quote };
  }

  const booking = await getBookingByReference(ref);
  const check = booking ? checkPaymentLink(booking, token) : "invalid";
  if (!booking || check === "invalid") throw ApiError.notFound(INVALID);
  if (check === "expired") throw new ApiError(410, "link_expired", EXPIRED);
  return { kind: "booking" as const, booking };
}

const QUOTE_SERVICE_LABEL: Record<string, string> = {
  corporate: "Corporate account",
  wedding: "Wedding",
  event: "Event",
  hourly: "Hourly charter",
  other: "Chauffeured transport",
};

publicRouter.post("/payments/link", lookupLimit, async (req, res) => {
  const { reference, token } = paymentLinkSchema.parse(req.body);
  const found = await payableForLink(reference, token);

  if (found.kind === "quote") {
    const { quote } = found;
    res.json({
      kind: "quote",
      reference: quote.reference,
      status: quote.status,
      serviceLabel: QUOTE_SERVICE_LABEL[quote.serviceType] ?? "Chauffeured transport",
      eventDate: quote.eventDate,
      amountCents: quote.agreedPriceCents,
      paymentStatus: quote.paymentStatus,
      canPay: canPayQuoteOnline(quote),
    });
    return;
  }

  const { booking } = found;
  // A class since removed from the fleet still reads as words, not a slug.
  let vehicleName = titleCase(booking.vehicleClass);
  try {
    vehicleName = (await getVehicleBySlug(booking.vehicleClass))?.name ?? vehicleName;
  } catch {
    // Keep the tidied slug.
  }

  res.json({
    kind: "booking",
    reference: booking.reference,
    status: booking.status,
    pickupAt: booking.pickupAt,
    pickup: booking.pickup,
    destination: booking.destination,
    vehicleName,
    amountCents: booking.quotedTotalCents,
    paymentStatus: booking.paymentStatus,
    canPay: canPayOnline(booking),
  });
});

publicRouter.post("/payments/link/checkout", lookupLimit, async (req, res) => {
  const { reference, token } = paymentLinkSchema.parse(req.body);
  const found = await payableForLink(reference, token);

  // Backing out of Stripe returns to the same link page, not a generic one.
  const base = env.SITE_BASE_URL.replace(/\/+$/, "");
  const ref = found.kind === "quote" ? found.quote.reference : found.booking.reference;
  const cancelUrl = `${base}/pay/${encodeURIComponent(ref)}?token=${encodeURIComponent(token)}`;

  const url =
    found.kind === "quote"
      ? await createQuoteCheckout(found.quote, { cancelUrl })
      : await createCheckout(found.booking, { cancelUrl });
  res.json({ url });
});

/**
 * Where Stripe's success page lands. The session id is looked up with Stripe,
 * not trusted, so this can only ever record a payment that really happened.
 * Returns no customer details beyond what the returning customer just paid.
 */
publicRouter.post("/payments/confirm", lookupLimit, async (req, res) => {
  const { sessionId } = paymentConfirmSchema.parse(req.body);
  res.json(await recordCheckout(sessionId));
});

/** Approved reviews, plus where to send a customer who wants to review on Google. */
publicRouter.get("/reviews", async (_req, res) => {
  res.json({ ...(await listApprovedReviews()), googleReviewUrl: googleReviewUrl() });
});

publicRouter.post("/reviews", submitLimit, requireFormGuard, async (req, res) => {
  const input = createReviewSchema.parse(req.body);
  await createReview(input);

  res.status(201).json({ received: true, googleReviewUrl: googleReviewUrl() });
});
