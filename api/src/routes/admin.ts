import { Router } from "express";

import { ApiError } from "../lib/http.js";
import { requireAdmin } from "../middleware.js";
import {
  listBookingsSchema,
  listQuotesSchema,
  updateBookingSchema,
  updateQuoteSchema,
} from "../schemas.js";
import {
  getActivity,
  getBookingById,
  listBookings,
  updateBooking,
} from "../services/bookings.js";
import { getQuoteById, listQuotes, updateQuote } from "../services/quotes.js";
import { getDashboardStats } from "../services/stats.js";

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

  res.json({ booking, activity: await getActivity("booking", id) });
});

adminRouter.patch("/bookings/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const patch = updateBookingSchema.parse(req.body);
  const booking = await updateBooking(id, patch, req.admin!.id);

  res.json({ booking, activity: await getActivity("booking", id) });
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
