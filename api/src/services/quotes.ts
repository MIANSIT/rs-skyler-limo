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
  source: string;
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
    source: row.source,
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
  details, source, created_at, updated_at`;

export async function createQuote(
  input: z.infer<typeof createQuoteSchema>,
  source: string,
): Promise<Quote> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = makeReference("RQ");
    try {
      const result = await execute(
        `INSERT INTO quotes
           (reference, service_type, event_date, passengers, company,
            customer_name, customer_email, customer_phone, details, source)
         VALUES
           (:reference, :serviceType, :eventDate, :passengers, :company,
            :customerName, :customerEmail, :customerPhone, :details, :source)`,
        {
          reference,
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

export async function updateQuote(
  id: number,
  patch: z.infer<typeof updateQuoteSchema>,
  adminUserId: number,
): Promise<Quote> {
  const existing = await getQuoteById(id);
  if (!existing) throw ApiError.notFound("That quote no longer exists.");

  return transaction(async (connection) => {
    if (patch.status !== undefined) {
      await executeOn(
        connection,
        `UPDATE quotes SET status = :status WHERE id = :id`,
        { status: patch.status, id },
      );
    }

    await executeOn(
      connection,
      `INSERT INTO activity_log
         (subject_type, subject_id, admin_user_id, action, from_status, to_status, note)
       VALUES ('quote', :id, :adminUserId, :action, :fromStatus, :toStatus, :note)`,
      {
        id,
        adminUserId,
        action: patch.status ? "status_changed" : "updated",
        fromStatus: patch.status ? existing.status : null,
        toStatus: patch.status ?? null,
        note: patch.note ?? null,
      },
    );

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
