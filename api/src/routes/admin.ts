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
  adminPaymentLinkSchema,
  updateQuoteSchema,
  updateReviewSchema,
} from "../schemas.js";
import {
  getActivity,
  findClashes,
  getBookingById,
  listBookings,
  listBookingsForExport,
  updateBooking,
} from "../services/bookings.js";
import {
  createAirport,
  deleteAirport,
  listAirports,
  updateAirport,
} from "../services/airports.js";
import {
  NOTIFIED_BOOKING_STATUSES,
  NOTIFIED_QUOTE_STATUSES,
} from "../emails/updates.js";
import {
  sendBookingUpdateEmail,
  sendQuoteUpdateEmail,
  sendPaymentLinkEmail,
  sendQuotedEmail,
} from "../services/mail.js";
import { createPaymentLink } from "../lib/payment-link.js";
import { canPayOnline, canPayQuoteOnline } from "../services/payments.js";
import { execute } from "../db.js";
import { bookingsWorkbook } from "../services/export.js";
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

/**
 * The bookings list as an Excel workbook, with the same filters as the list.
 * Registered before `/bookings/:id`, which would otherwise take "export" as an
 * id. `no-store`: it is customer data and must not sit in any cache.
 */
adminRouter.get("/bookings/export", async (req, res) => {
  const { status, q, from, to } = listBookingsSchema.parse(req.query);
  const bookings = await listBookingsForExport({ status, q, from, to });
  const file = await bookingsWorkbook(bookings);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Cache-Control", "no-store");
  res.send(file);
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
  const before = await getBookingById(id);
  const booking = await updateBooking(id, patch, req.admin!.id);

  // Only a real change, to a status the customer should hear about, with the
  // operator's box ticked. Not awaited and never throws — the change is saved.
  if (
    patch.notifyCustomer &&
    before?.status !== booking.status &&
    (NOTIFIED_BOOKING_STATUSES as readonly string[]).includes(booking.status)
  ) {
    void sendBookingUpdateEmail(booking).catch((error: unknown) => {
      console.error(
        `[mail] unexpected failure for ${booking.reference}:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

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
  const before = await getQuoteById(id);
  const quote = await updateQuote(id, patch, req.admin!.id);

  // A status the customer should hear about, or a new agreed price — either
  // way only with the operator's box ticked.
  const statusNews =
    before?.status !== quote.status &&
    (NOTIFIED_QUOTE_STATUSES as readonly string[]).includes(quote.status);
  const priceNews =
    quote.agreedPriceCents !== null && before?.agreedPriceCents !== quote.agreedPriceCents;

  if (patch.notifyCustomer && (statusNews || priceNews)) {
    void sendQuoteUpdateEmail(quote).catch((error: unknown) => {
      console.error(
        `[mail] unexpected failure for ${quote.reference}:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

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
/**
 * A signed payment link for a priced, unpaid card booking — to copy into a
 * message, or with `send: true` emailed to the customer as well. Each one is
 * noted in the booking's history, so the office can see what went out when.
 */
adminRouter.post("/bookings/:id/payment-link", async (req, res) => {
  const id = parseId(req.params.id);
  const { send } = adminPaymentLinkSchema.parse(req.body ?? {});

  const booking = await getBookingById(id);
  if (!booking) throw ApiError.notFound("That booking no longer exists.");

  if (!canPayOnline(booking)) {
    throw ApiError.conflict(
      booking.paymentStatus === "paid"
        ? "This booking is already paid."
        : booking.paymentMethod !== "card"
          ? "This booking is set to cash on delivery. Switch it to card first."
          : booking.quotedTotalCents === null
            ? "Set a price before sending a payment link."
            : booking.status === "cancelled"
              ? "This booking is cancelled."
              : "Card payment is not configured on the server.",
    );
  }

  const link = createPaymentLink(booking);

  await execute(
    `INSERT INTO activity_log
       (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
     VALUES ('booking', :id, :adminUserId, :action, NULL, NULL, :note)`,
    {
      id,
      adminUserId: req.admin!.id,
      action: send ? "payment_link_sent" : "payment_link_created",
      note: `Link for $${(booking.quotedTotalCents! / 100).toFixed(2)}, valid until ${link.expiresAt.toISOString().slice(0, 10)}.`,
    },
  );

  if (send) {
    void sendPaymentLinkEmail(booking, link.url, link.expiresAt).catch((error: unknown) => {
      console.error(
        `[mail] unexpected failure for ${booking.reference}:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

  res.json({ url: link.url, expiresAt: link.expiresAt.toISOString(), sent: send });
});

/**
 * The same for a quote request's agreed price. "Send" emails the customer the
 * price with the Pay button — the same "Your price" message a priced request
 * gets — so there is one email to recognise, not two.
 */
adminRouter.post("/quotes/:id/payment-link", async (req, res) => {
  const id = parseId(req.params.id);
  const { send } = adminPaymentLinkSchema.parse(req.body ?? {});

  const quote = await getQuoteById(id);
  if (!quote) throw ApiError.notFound("That quote request no longer exists.");

  if (!canPayQuoteOnline(quote)) {
    throw ApiError.conflict(
      quote.paymentStatus === "paid"
        ? "This request is already paid."
        : quote.agreedPriceCents === null
          ? "Set the agreed price before sending a payment link."
          : quote.paymentMethod !== "card"
            ? "Payment is set to cash on delivery. Choose card to send a link."
            : quote.status === "lost"
              ? "This request is closed."
              : "Card payment is not configured on the server.",
    );
  }

  const link = createPaymentLink({
    id: quote.id,
    reference: quote.reference,
    quotedTotalCents: quote.agreedPriceCents,
  });

  await execute(
    `INSERT INTO activity_log
       (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
     VALUES ('quote', :id, :adminUserId, :action, NULL, NULL, :note)`,
    {
      id,
      adminUserId: req.admin!.id,
      action: send ? "payment_link_sent" : "payment_link_created",
      note: `Link for $${(quote.agreedPriceCents! / 100).toFixed(2)}, valid until ${link.expiresAt.toISOString().slice(0, 10)}.`,
    },
  );

  if (send) {
    void sendQuoteUpdateEmail(quote).catch((error: unknown) => {
      console.error(
        `[mail] unexpected failure for ${quote.reference}:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

  res.json({ url: link.url, expiresAt: link.expiresAt.toISOString(), sent: send });
});

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
