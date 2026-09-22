import { Router } from "express";

import { ApiError } from "../lib/http.js";
import { requireAdmin } from "../middleware.js";
import {
  airportInputSchema,
  airportUpdateSchema,
  listBookingsSchema,
  listQuotesSchema,
  listReviewsSchema,
  saveRatesSchema,
  saveZoneRatesSchema,
  sendQuoteSchema,
  updateBookingSchema,
  updateQuoteSchema,
  updateReviewSchema,
} from "../schemas.js";
import {
  getActivity,
  findClashes,
  getBookingById,
  listBookings,
  updateBooking,
} from "../services/bookings.js";
import {
  createAirport,
  deleteAirport,
  listAirports,
  updateAirport,
} from "../services/airports.js";
import { sendQuotedEmail } from "../services/mail.js";
import { getQuoteById, listQuotes, updateQuote } from "../services/quotes.js";
import {
  deleteReview,
  listReviewsForAdmin,
  setReviewStatus,
} from "../services/reviews.js";
import { getRateGrid, saveRates, sendQuote } from "../services/pricing.js";
import { getDashboardStats } from "../services/stats.js";
import { getZoneRateGrid, saveZoneRates } from "../services/zone-rates.js";

export const adminRouter: Router = Router();

adminRouter.use(requireAdmin);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw ApiError.notFound();
  return id;
}

adminRouter.get("/stats", async (_req, res) => {
  res.json(await getDashboardStats());
});

adminRouter.get("/bookings", async (req, res) => {
  const filters = listBookingsSchema.parse(req.query);
  res.json(await listBookings(filters));
});

adminRouter.get("/bookings/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const booking = await getBookingById(id);
  if (!booking) throw ApiError.notFound("That booking no longer exists.");

  res.json({
    booking,
    activity: await getActivity("booking", id),
    clashes: await findClashes(booking),
  });
});

adminRouter.patch("/bookings/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const patch = updateBookingSchema.parse(req.body);
  const booking = await updateBooking(id, patch, req.admin!.id);

  res.json({
    booking,
    activity: await getActivity("booking", id),
    clashes: await findClashes(booking),
  });
});

adminRouter.get("/quotes", async (req, res) => {
  const filters = listQuotesSchema.parse(req.query);
  res.json(await listQuotes(filters));
});

adminRouter.get("/quotes/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const quote = await getQuoteById(id);
  if (!quote) throw ApiError.notFound("That quote no longer exists.");

  res.json({ quote, activity: await getActivity("quote", id) });
});

adminRouter.patch("/quotes/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const patch = updateQuoteSchema.parse(req.body);
  const quote = await updateQuote(id, patch, req.admin!.id);

  res.json({ quote, activity: await getActivity("quote", id) });
});

/* -------------------------------------------------------------------------- */
/* Airport rate card                                                          */
/* -------------------------------------------------------------------------- */

adminRouter.get("/rates", async (_req, res) => {
  res.json(await getRateGrid());
});

adminRouter.put("/rates", async (req, res) => {
  const { rates } = saveRatesSchema.parse(req.body);
  await saveRates(rates, req.admin!.id);

  res.json(await getRateGrid());
});

/* -------------------------------------------------------------------------- */
/* Regional reference rates — not read by `decideFare`, see zone-rates.ts     */
/* -------------------------------------------------------------------------- */

adminRouter.get("/zone-rates", async (_req, res) => {
  res.json(await getZoneRateGrid());
});

adminRouter.put("/zone-rates", async (req, res) => {
  const { rates } = saveZoneRatesSchema.parse(req.body);
  await saveZoneRates(rates, req.admin!.id);

  res.json(await getZoneRateGrid());
});

/* -------------------------------------------------------------------------- */
/* Airports                                                                   */
/* -------------------------------------------------------------------------- */

function parseCode(raw: string | undefined): string {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(code)) throw ApiError.notFound();
  return code;
}

adminRouter.get("/airports", async (_req, res) => {
  res.json({ airports: await listAirports() });
});

adminRouter.post("/airports", async (req, res) => {
  const input = airportInputSchema.parse(req.body);
  res.status(201).json({ airport: await createAirport(input) });
});

adminRouter.patch("/airports/:code", async (req, res) => {
  const patch = airportUpdateSchema.parse(req.body);
  res.json({ airport: await updateAirport(parseCode(req.params.code), patch) });
});

adminRouter.delete("/airports/:code", async (req, res) => {
  await deleteAirport(parseCode(req.params.code));
  res.status(204).end();
});

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

adminRouter.get("/reviews", async (req, res) => {
  const { status } = listReviewsSchema.parse(req.query);
  res.json({ reviews: await listReviewsForAdmin(status) });
});

adminRouter.patch("/reviews/:id", async (req, res) => {
  const { status } = updateReviewSchema.parse(req.body);
  await setReviewStatus(parseId(req.params.id), status, req.admin!.id);
  res.json({ ok: true });
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  await deleteReview(parseId(req.params.id));
  res.status(204).end();
});

/** Prices a quote request and moves it to `quoted`. */
adminRouter.post("/bookings/:id/quote", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw ApiError.notFound();

  const { totalCents, note } = sendQuoteSchema.parse(req.body);
  await sendQuote(id, totalCents, note ?? null, req.admin!.id);

  const booking = await getBookingById(id);

  // Tell the customer their price is ready. Not awaited, never throws: the
  // quote is already saved, so a mail failure belongs in the log.
  if (booking) {
    void sendQuotedEmail(booking).catch((error: unknown) => {
      console.error(
        `[mail] unexpected failure for ${booking.reference}:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

  res.json({ booking });
});
