import type { z } from "zod";

import {
  execute,
  executeOn,
  query,
  queryOne,
  runOn,
  transaction,
  type RowDataPacket,
} from "../db.js";
import { ApiError } from "../lib/http.js";
import { makeReference } from "../lib/reference.js";
import { formatRate, normaliseRate, withTax } from "../lib/tax.js";
import { getDefaultTaxRate } from "./settings.js";
import type {
  createQuoteSchema,
  listQuotesSchema,
  updateQuoteSchema,
} from "../schemas.js";

type QuoteRow = RowDataPacket & {
  id: number;
  reference: string;
  status: string;
  service_type: string;
  event_date: Date | null;
  passengers: number | null;
  company: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  details: string;
  agreed_price_cents: number | null;
  tax_rate: number;
  tax_cents: number;
  priced_at: Date | null;
  payment_method: "card" | "cash" | null;
  payment_status: "unpaid" | "paid";
  paid_at: Date | null;
  stripe_payment_intent_id: string | null;
  source: string;
  customer_change_pending: number;
  customer_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type Quote = ReturnType<typeof toQuote>;

function toQuote(row: QuoteRow) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceType: row.service_type,
    // A DATE has no time or zone; sending the calendar day avoids the
    // off-by-one that toISOString() introduces west of Greenwich.
    eventDate: row.event_date ? formatDate(row.event_date) : null,
    passengers: row.passengers,
    company: row.company,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    details: row.details,
    /** What the customer pays, sales tax included. Null until priced. */
    agreedPriceCents: row.agreed_price_cents,
    /** The agreed price before tax. Null until priced. */
    priceCents:
      row.agreed_price_cents === null ? null : row.agreed_price_cents - row.tax_cents,
    /** This request's own rate, as a percentage. */
    taxRate: Number(row.tax_rate),
    taxCents: row.tax_cents,
    pricedAt: row.priced_at ? row.priced_at.toISOString() : null,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    source: row.source,
    /** The customer changed it from /track and no operator has reviewed that yet. */
    customerChangePending: row.customer_change_pending === 1,
    customerChangedAt: row.customer_changed_at ? row.customer_changed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SELECT_COLUMNS = `id, reference, status, service_type, event_date,
  passengers, company, customer_name, customer_email, customer_phone,
  details, agreed_price_cents, tax_rate, tax_cents, priced_at, payment_method, payment_status, paid_at,
  stripe_payment_intent_id, source, customer_change_pending, customer_changed_at,
  created_at, updated_at`;

export async function createQuote(
  input: z.infer<typeof createQuoteSchema>,
  source: string,
): Promise<Quote> {
  // The rate of the day the request came in, as on a booking.
  const taxRate = await getDefaultTaxRate();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = makeReference("RQ");
    try {
      const result = await execute(
        `INSERT INTO quotes
           (reference, service_type, event_date, passengers, company,
            customer_name, customer_email, customer_phone, details, tax_rate, source)
         VALUES
           (:reference, :serviceType, :eventDate, :passengers, :company,
            :customerName, :customerEmail, :customerPhone, :details, :taxRate, :source)`,
        {
          reference,
          taxRate,
          serviceType: input.serviceType,
          eventDate: input.eventDate ?? null,
          passengers: input.passengers ?? null,
          company: input.company ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: input.customerPhone,
          details: input.details,
          source,
        },
      );

      const created = await getQuoteById(result.insertId);
      if (!created) throw new Error("Quote vanished immediately after insert");
      return created;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "ER_DUP_ENTRY"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(500, "reference_exhausted", "Could not allocate a quote reference.");
}

export async function getQuoteById(id: number): Promise<Quote | null> {
  const row = await queryOne<QuoteRow>(
    `SELECT ${SELECT_COLUMNS} FROM quotes WHERE id = :id LIMIT 1`,
    { id },
  );
  return row ? toQuote(row) : null;
}

export async function getQuoteByReference(
  reference: string,
): Promise<Quote | null> {
  const row = await queryOne<QuoteRow>(
    `SELECT ${SELECT_COLUMNS} FROM quotes WHERE reference = :reference LIMIT 1`,
    { reference: reference.toUpperCase() },
  );
  return row ? toQuote(row) : null;
}

export async function listQuotes(filters: z.infer<typeof listQuotesSchema>) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    conditions.push("status = :status");
    params.status = filters.status;
  }

  if (filters.changed === "1") {
    conditions.push("customer_change_pending = 1");
  }

  if (filters.q) {
    conditions.push(`(reference LIKE :q OR customer_name LIKE :q
      OR customer_email LIKE :q OR customer_phone LIKE :q OR company LIKE :q)`);
    params.q = `%${filters.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM quotes ${where}`,
    params,
  );

  const perPage = filters.perPage;
  const offset = (filters.page - 1) * perPage;

  const rows = await query<QuoteRow>(
    `SELECT ${SELECT_COLUMNS} FROM quotes ${where}
      ORDER BY CASE WHEN status = 'new' THEN 0 ELSE 1 END, created_at DESC
      LIMIT ${perPage} OFFSET ${offset}`,
    params,
  );

  return {
    quotes: rows.map(toQuote),
    total: countRow?.total ?? 0,
    page: filters.page,
    perPage,
  };
}

/** Quote-request fields the dashboard's edit page may change. */
const QUOTE_EDITABLE_FIELDS = [
  { key: "serviceType", column: "service_type", label: "service" },
  { key: "eventDate", column: "event_date", label: "event date" },
  { key: "passengers", column: "passengers", label: "passengers" },
  { key: "company", column: "company", label: "company" },
  { key: "customerName", column: "customer_name", label: "customer name" },
  { key: "customerEmail", column: "customer_email", label: "email" },
  { key: "customerPhone", column: "customer_phone", label: "phone" },
  { key: "details", column: "details", label: "details" },
] as const;

export async function updateQuote(
  id: number,
  patch: z.infer<typeof updateQuoteSchema>,
  adminUserId: number,
): Promise<Quote> {
  const existing = await getQuoteById(id);
  if (!existing) throw ApiError.notFound("That quote no longer exists.");

  return transaction(async (connection) => {
    const assignments: string[] = [];
    const params: Record<string, unknown> = { id };
    const changed: string[] = [];

    if (patch.status !== undefined) {
      assignments.push("status = :status");
      params.status = patch.status;
    }

    for (const field of QUOTE_EDITABLE_FIELDS) {
      const next = patch[field.key];
      if (next === undefined) continue;
      const value =
        field.key === "customerEmail" && typeof next === "string" ? next.toLowerCase() : next;
      if (value === existing[field.key]) continue;
      assignments.push(`${field.column} = :${field.key}`);
      params[field.key] = value;
      changed.push(field.label);
    }

    // The operator sets the price before tax and the rate; the agreed total
    // and the tax are worked out here. Either moving stamps `priced_at`, so the
    // office can see when the customer was last given a figure.
    const basePriceMoved = patch.priceCents !== undefined && patch.priceCents !== existing.priceCents;
    const rateMoved =
      patch.taxRate !== undefined && normaliseRate(patch.taxRate) !== existing.taxRate;
    const nextPrice = patch.priceCents !== undefined ? patch.priceCents : existing.priceCents;
    const nextRate = normaliseRate(patch.taxRate ?? existing.taxRate);
    const taxed = nextPrice === null ? null : withTax(nextPrice, nextRate);
    const priceChanged = basePriceMoved || (rateMoved && existing.priceCents !== null);

    if (basePriceMoved || rateMoved) {
      if (existing.paymentStatus === "paid" && patch.paymentStatus !== "unpaid") {
        throw ApiError.conflict(
          "This request is paid, so its price is locked. Mark it unpaid first to change it.",
        );
      }
      assignments.push(
        "agreed_price_cents = :agreedPriceCents",
        "tax_rate = :taxRate",
        "tax_cents = :taxCents",
      );
      if (priceChanged) {
        assignments.push(taxed === null ? "priced_at = NULL" : "priced_at = UTC_TIMESTAMP()");
      }
      params.agreedPriceCents = taxed?.totalCents ?? null;
      params.taxRate = nextRate;
      params.taxCents = taxed?.taxCents ?? 0;
      if (rateMoved) changed.push(`tax rate (${formatRate(existing.taxRate)} → ${formatRate(nextRate)})`);
    }

    const methodChanged =
      patch.paymentMethod !== undefined && patch.paymentMethod !== existing.paymentMethod;
    if (methodChanged) {
      assignments.push("payment_method = :paymentMethod");
      params.paymentMethod = patch.paymentMethod;
    }

    // `paid_at` follows the status, stamped when the money was recorded.
    const statusPaidChanged =
      patch.paymentStatus !== undefined && patch.paymentStatus !== existing.paymentStatus;
    if (statusPaidChanged) {
      assignments.push("payment_status = :paymentStatus");
      assignments.push(patch.paymentStatus === "paid" ? "paid_at = UTC_TIMESTAMP()" : "paid_at = NULL");
      params.paymentStatus = patch.paymentStatus;
    }

    if (assignments.length > 0) {
      await executeOn(connection, `UPDATE quotes SET ${assignments.join(", ")} WHERE id = :id`, params);
    }

    const METHOD_LABEL: Record<string, string> = { card: "card (Stripe)", cash: "cash on delivery" };
    const paymentNote = [
      methodChanged && patch.paymentMethod ? `Payment by ${METHOD_LABEL[patch.paymentMethod]}.` : "",
      statusPaidChanged ? `Marked ${patch.paymentStatus}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const priceNote = priceChanged
      ? taxed === null
        ? "Agreed price cleared."
        : `Agreed price set to ${money(taxed.subtotalCents)} + ${formatRate(taxed.taxRate)} tax ${money(
            taxed.taxCents,
          )} = ${money(taxed.totalCents)}.`
      : "";

    if (assignments.length > 0 || patch.note) {
      await executeOn(
        connection,
        `INSERT INTO activity_log
           (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
         VALUES ('quote', :id, :adminUserId, :action, :fromStatus, :toStatus, :note)`,
        {
          id,
          adminUserId,
          action: patch.status
            ? "status_changed"
            : priceChanged
              ? "price_set"
              : changed.length > 0
                ? "details_updated"
                : statusPaidChanged
                  ? `payment_${patch.paymentStatus}`
                  : methodChanged && patch.paymentMethod
                    ? `payment_method_${patch.paymentMethod}`
                    : "updated",
          fromStatus: patch.status ? existing.status : null,
          toStatus: patch.status ?? null,
          note:
            [
              priceNote,
              paymentNote,
              changed.length > 0 ? `Changed: ${changed.join(", ")}.` : "",
              patch.note ?? "",
            ]
              .filter(Boolean)
              .join(" ") || null,
        },
      );
    }

    const rows = await runOn<QuoteRow>(
      connection,
      `SELECT ${SELECT_COLUMNS} FROM quotes WHERE id = :id`,
      { id },
    );
    const row = rows[0];
    if (!row) throw ApiError.notFound("That quote no longer exists.");
    return toQuote(row);
  });
}
