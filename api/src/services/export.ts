import ExcelJS from "exceljs";

import type { Booking } from "./bookings.js";
import { listVehicles } from "./vehicles.js";

/**
 * The bookings list as an Excel workbook.
 *
 * A real .xlsx rather than CSV: a CSV opens in one column wherever Excel's
 * locale expects semicolons, and a customer who types `=…` into a free-text
 * field becomes a formula in a CSV. Here every cell is typed — text is text,
 * money is a number in dollars, times are real dates in New York time — so the
 * sheet sorts and filters properly.
 */

const TIME_ZONE = "America/New_York";

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * An instant as the New York wall-clock time Excel should display.
 *
 * Excel has no time zones: a date cell is a wall-clock value. ExcelJS writes a
 * Date's UTC fields, so the Date is built with New York's fields as UTC.
 */
function newYorkCell(iso: string | null): Date | null {
  if (!iso) return null;
  const parts = wallClock.formatToParts(new Date(iso));
  const field = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    Date.UTC(field("year"), field("month") - 1, field("day"), field("hour"), field("minute")),
  );
}

const TRIP: Record<string, string> = {
  airport: "Airport transfer",
  "point-to-point": "Point to point",
  hourly: "Hourly",
};

const SERVICE: Record<string, string> = {
  personal: "Personal",
  corporate: "Corporate",
  wedding: "Wedding",
  event: "Event",
  other: "Other",
};

const PAYMENT: Record<string, string> = { card: "Card (Stripe)", cash: "Cash on delivery" };

export async function bookingsWorkbook(bookings: Booking[]): Promise<Buffer> {
  // Name the car, not its slug; a class since removed keeps its slug.
  const vehicles = await listVehicles({ includeInactive: true });
  const vehicleName = new Map(vehicles.map((vehicle) => [vehicle.slug, vehicle.name]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RSSkyler Limo dashboard";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Bookings", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const dateTime = "yyyy-mm-dd hh:mm";
  const dollars = '"$"#,##0.00';

  sheet.columns = [
    { header: "Reference", key: "reference", width: 13 },
    { header: "Status", key: "status", width: 11 },
    { header: "Pick-up (New York)", key: "pickupAt", width: 18, style: { numFmt: dateTime } },
    { header: "Trip type", key: "tripType", width: 16 },
    { header: "Service", key: "serviceType", width: 11 },
    { header: "Pick-up", key: "pickup", width: 34 },
    { header: "Drop-off", key: "destination", width: 34 },
    { header: "Airport", key: "airport", width: 9 },
    { header: "Direction", key: "direction", width: 14 },
    { header: "Airline", key: "airline", width: 14 },
    { header: "Flight", key: "flight", width: 11 },
    { header: "Vehicle", key: "vehicle", width: 18 },
    { header: "Passengers", key: "passengers", width: 11 },
    { header: "Bags", key: "bags", width: 7 },
    { header: "Child seats", key: "childSeats", width: 11 },
    { header: "Pricing", key: "pricing", width: 9 },
    { header: "Fare (USD)", key: "fare", width: 12, style: { numFmt: dollars } },
    { header: "Payment method", key: "paymentMethod", width: 17 },
    { header: "Payment status", key: "paymentStatus", width: 14 },
    { header: "Paid at (New York)", key: "paidAt", width: 18, style: { numFmt: dateTime } },
    { header: "Customer", key: "customerName", width: 22 },
    { header: "Phone", key: "customerPhone", width: 17 },
    { header: "Email", key: "customerEmail", width: 28 },
    { header: "Customer instructions", key: "notes", width: 40 },
    { header: "Requested (New York)", key: "createdAt", width: 18, style: { numFmt: dateTime } },
  ];

  for (const booking of bookings) {
    sheet.addRow({
      reference: booking.reference,
      status: booking.status,
      pickupAt: newYorkCell(booking.pickupAt),
      tripType: TRIP[booking.tripType] ?? booking.tripType,
      serviceType: SERVICE[booking.serviceType] ?? booking.serviceType,
      pickup: booking.pickup,
      destination: booking.destination,
      airport: booking.airportCode ?? "",
      direction:
        booking.airportDirection === "to-airport"
          ? "To airport"
          : booking.airportDirection === "from-airport"
            ? "From airport"
            : "",
      airline: booking.airline ?? "",
      flight: booking.flightNumber ?? "",
      vehicle: vehicleName.get(booking.vehicleClass) ?? booking.vehicleClass,
      passengers: booking.passengers,
      bags: booking.bags,
      childSeats: booking.childSeats,
      pricing: booking.pricingMode === "fixed" ? "Fixed" : "Quote",
      fare: booking.quotedTotalCents === null ? null : booking.quotedTotalCents / 100,
      paymentMethod: PAYMENT[booking.paymentMethod] ?? booking.paymentMethod,
      paymentStatus: booking.paymentStatus === "paid" ? "Paid" : "Unpaid",
      paidAt: newYorkCell(booking.paidAt),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      notes: booking.notes ?? "",
      createdAt: newYorkCell(booking.createdAt),
    });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2142" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
