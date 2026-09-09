import { randomBytes } from "node:crypto";

import { pool, query, type RowDataPacket } from "../db.js";
import { env, isProduction } from "../env.js";
import { createAdminUser } from "../services/auth.js";
import { createBooking } from "../services/bookings.js";
import { createQuote } from "../services/quotes.js";

/**
 * Development data only. Refuses to run against production because seeding a
 * live dashboard with invented customers is how fake bookings get dispatched.
 */
async function main() {
  if (isProduction) {
    throw new Error("Refusing to seed a production database.");
  }

  const existing = await query<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM admin_users",
  );

  if ((existing[0]?.total ?? 0) === 0) {
    const password =
      process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");

    await createAdminUser({
      email: process.env.SEED_ADMIN_EMAIL ?? "ops@rsskylerlimo.com",
      name: "Reservations Desk",
      password,
      role: "owner",
    });

    console.log("\nSeeded operator account:");
    console.log(`  email:    ${process.env.SEED_ADMIN_EMAIL ?? "ops@rsskylerlimo.com"}`);
    console.log(`  password: ${password}`);
    console.log("  (development only — create real accounts with `npm run create-admin`)\n");
  } else {
    console.log("Operator accounts already exist; leaving them alone.");
  }

  const bookingCount = await query<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM bookings",
  );

  if ((bookingCount[0]?.total ?? 0) > 0) {
    console.log("Bookings already present; skipping sample data.");
    await pool.end();
    return;
  }

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const samples = [
    {
      tripType: "airport" as const,
      pickup: "JFK — Terminal 4",
      destination: "The Greenwich Hotel, Tribeca",
      pickupAt: hoursFromNow(6),
      passengers: 2,
      bags: 3,
      vehicleClass: "luxury-suv",
      airline: "Delta",
      flightNumber: "DL 401",
      customerName: "Amara Osei",
      customerEmail: "amara.osei@example.com",
      customerPhone: "+1 212 555 0142",
      notes: "Arriving from Accra. Two large cases.",
      quotedTotalCents: 13500,
    },
    {
      tripType: "point-to-point" as const,
      pickup: "1 Rockefeller Plaza",
      destination: "Brooklyn Navy Yard, Building 77",
      pickupAt: hoursFromNow(30),
      passengers: 1,
      bags: 0,
      vehicleClass: "luxury-sedan",
      airline: null,
      flightNumber: null,
      customerName: "Daniel Reyes",
      customerEmail: "d.reyes@example.com",
      customerPhone: "(917) 555-0188",
      notes: null,
      quotedTotalCents: 8100,
    },
    {
      tripType: "hourly" as const,
      pickup: "The Carlyle, Upper East Side",
      destination: "As directed — five hours",
      pickupAt: hoursFromNow(72),
      passengers: 3,
      bags: 2,
      vehicleClass: "premium-suv",
      airline: null,
      flightNumber: null,
      customerName: "Sofia Marchetti",
      customerEmail: "s.marchetti@example.com",
      customerPhone: "+1 646 555 0110",
      notes: "Three stops, itinerary to follow from the assistant.",
      quotedTotalCents: 29600,
    },
    {
      tripType: "airport" as const,
      pickup: "Newark (EWR) — Terminal C",
      destination: "Hoboken, Washington Street",
      pickupAt: hoursFromNow(-20),
      passengers: 4,
      bags: 5,
      vehicleClass: "sprinter-van",
      airline: "United",
      flightNumber: "UA 1712",
      customerName: "Priya Nandakumar",
      customerEmail: "priya.n@example.com",
      customerPhone: "201-555-0173",
      notes: null,
      quotedTotalCents: 24000,
    },
  ];

  for (const sample of samples) {
    const booking = await createBooking(sample, "seed");
    console.log(`  booking ${booking.reference} — ${sample.customerName}`);
  }

  const quoteSamples = [
    {
      serviceType: "wedding" as const,
      eventDate: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10),
      passengers: 40,
      company: null,
      customerName: "Grace and Theo Lindqvist",
      customerEmail: "gracelindqvist@example.com",
      customerPhone: "+1 718 555 0164",
      details:
        "Ceremony in Prospect Park, reception at the Wythe. Sprinter for the party plus a sedan for the couple.",
    },
    {
      serviceType: "corporate" as const,
      eventDate: null,
      passengers: null,
      company: "Halden & Roe",
      customerName: "Bea Okonjo",
      customerEmail: "b.okonjo@example.com",
      customerPhone: "(212) 555-0119",
      details:
        "Roughly twelve airport runs a month for partners. Need monthly invoicing and a named contact.",
    },
  ];

  for (const sample of quoteSamples) {
    const quote = await createQuote(sample, "seed");
    console.log(`  quote   ${quote.reference} — ${sample.customerName}`);
  }

  console.log(`\nSeeded \`${env.DB_NAME}\`.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end().catch(() => {});
  process.exit(1);
});
