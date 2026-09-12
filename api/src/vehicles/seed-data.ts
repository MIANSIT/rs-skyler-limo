import type { VehicleInput } from "../schemas.js";

/**
 * The four classes the site already advertised, lifted from the hardcoded
 * `src/lib/content.ts` so nothing about the public fleet changes the day it
 * starts reading from the database.
 *
 * Copy transcribed from the Brand Guidelines, Edition 02, 2026 (Chapter 10).
 * Amenities are the conservative set — only what the requirement doc and the
 * existing copy already claim. An operator adds the rest once they confirm it.
 */
export const FLEET_SEED: VehicleInput[] = [
  {
    slug: "luxury-sedan",
    name: "Luxury Sedan",
    category: "sedan",
    model: null,
    passengerCapacity: 3,
    luggageCapacity: 2,
    maxChildSeats: 1,
    baseFareCents: 9500,
    bestFor:
      "Individual and two-passenger travel — airport transfers, point-to-point, executive pickups.",
    detail:
      "The default choice for a 6 a.m. run to JFK or a meeting across town. Quiet cabin, bottled water, a driver who already knows the terminal.",
    amenities: [
      "flight-tracking",
      "meet-and-greet",
      "luggage-assistance",
      "bottled-water",
      "phone-charger",
      "climate-control",
      "leather-interior",
      "child-seat",
      "hourly-available",
      "multiple-stops",
    ],
    isActive: true,
    displayOrder: 0,
  },
  {
    slug: "luxury-suv",
    name: "Luxury SUV",
    category: "suv",
    model: null,
    passengerCapacity: 5,
    luggageCapacity: 4,
    maxChildSeats: 2,
    baseFareCents: 13500,
    bestFor:
      "Small groups and extra luggage, without stepping up to a full premium class.",
    detail:
      "Room for a family arriving on an international flight, or three colleagues and their carry-ons, at a fare that stays sensible.",
    amenities: [
      "flight-tracking",
      "meet-and-greet",
      "luggage-assistance",
      "bottled-water",
      "phone-charger",
      "climate-control",
      "leather-interior",
      "child-seat",
      "extra-legroom",
      "hourly-available",
      "multiple-stops",
    ],
    isActive: true,
    displayOrder: 1,
  },
  {
    slug: "premium-suv",
    name: "Premium SUV",
    category: "premium-suv",
    model: null,
    passengerCapacity: 5,
    luggageCapacity: 4,
    maxChildSeats: 2,
    baseFareCents: 18500,
    bestFor:
      "The top of the fleet — VIP, diplomatic and flagship corporate bookings.",
    detail:
      "Reserved for the bookings where the vehicle itself is part of the impression. Vetted drivers, consistent assignment on repeat travel.",
    amenities: [
      "flight-tracking",
      "meet-and-greet",
      "luggage-assistance",
      "bottled-water",
      "phone-charger",
      "wifi",
      "climate-control",
      "leather-interior",
      "privacy-partition",
      "extra-legroom",
      "child-seat",
      "hourly-available",
      "multiple-stops",
    ],
    isActive: true,
    displayOrder: 2,
  },
  {
    slug: "sprinter-van",
    name: "Sprinter Van",
    category: "sprinter",
    model: null,
    passengerCapacity: 14,
    luggageCapacity: 12,
    maxChildSeats: 2,
    baseFareCents: 24000,
    bestFor: "Group transport, wedding parties, and event logistics.",
    detail:
      "One vehicle instead of three cars that arrive four minutes apart. The backbone of the wedding and events division.",
    amenities: [
      "flight-tracking",
      "meet-and-greet",
      "luggage-assistance",
      "bottled-water",
      "phone-charger",
      "climate-control",
      "extra-legroom",
      "child-seat",
      "hourly-available",
      "multiple-stops",
    ],
    isActive: true,
    displayOrder: 3,
  },
];
