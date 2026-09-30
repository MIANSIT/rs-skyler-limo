/**
 * Copy for the five airport pages.
 *
 * The brief is explicit that these must not repeat each other, so each airport
 * gets its own angle rather than one template with the name swapped: JFK is
 * about international arrivals, LaGuardia about its separate terminals, Newark
 * about crossing into New Jersey, Teterboro about private aviation and
 * Westchester about the edge of the fixed-fare area.
 *
 * What stays true of every page is the rule set — the waiting windows, the
 * fare, the cancellation window — and those are read from `content.ts` and the
 * rate card rather than typed here, so a policy change moves every page at once.
 *
 * Facts about the airports themselves are geography and public record. Nothing
 * here claims a pickup process, a travel time or a service the business has
 * not confirmed: meet and greet is described exactly as the terms describe it,
 * as a request, and flights are not tracked.
 */
import { childSeatFee, hourlyWaitingRate } from "@/lib/content";

export type AirportPageContent = {
  /** Matches `airports.code` in the database, which is what the rates key on. */
  code: string;
  slug: string;
  /** How the airport is named in running text. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** One line for the hub page's card. */
  summary: string;
  title: string;
  intro: string;
  /** Label/value facts about the airport itself. */
  facts: { label: string; value: string }[];
  /** The one thing that makes this airport different, as a heading and body. */
  focus: { eyebrow: string; title: string; paragraphs: string[] };
  /** Arriving and departing, specific to this airport. */
  arriving: string[];
  departing: string[];
  faqs: { question: string; answer: string }[];
};

const waitingCharge = `After that, waiting is $${hourlyWaitingRate} per hour in 15-minute increments, and we call before it starts.`;

export const airportPages: AirportPageContent[] = [
  {
    code: "JFK",
    slug: "jfk-airport-car-service",
    name: "JFK",
    metaTitle: "JFK Airport Car Service",
    metaDescription:
      "Chauffeured transfers between JFK and all five boroughs at a fixed, published fare. Sixty minutes of complimentary waiting on international arrivals.",
    eyebrow: "JFK International",
    summary:
      "International arrivals, with sixty minutes' waiting from your actual landing.",
    title: "JFK car service, timed to when you actually land",
    intro:
      "New York's international gateway, in southeast Queens. A fixed fare to or from anywhere in the five boroughs, and an hour of waiting on international arrivals before the meter moves.",
    facts: [
      { label: "Where", value: "Southeast Queens, on Jamaica Bay" },
      { label: "Mostly", value: "International and long-haul flights" },
      { label: "Complimentary wait", value: "60 minutes international · 45 domestic" },
    ],
    focus: {
      eyebrow: "International arrivals",
      title: "Immigration takes as long as it takes",
      paragraphs: [
        "Most of JFK's traffic is international, and an international arrival is the least predictable part of any trip: a long queue at passport control, then a longer one at the carousel. That is why international flights carry sixty minutes of complimentary waiting rather than forty-five.",
        "The clock starts from your actual landing time, not the scheduled one. A flight that lands an hour late costs you nothing in waiting — give us the flight number when you book, and that is the time we count from.",
        "JFK is also in the middle of a rebuild, with terminals opening and closing in stages. The terminal on an old itinerary may not be the one you use, which is one more reason the flight number matters more than the terminal.",
      ],
    },
    arriving: [
      "Book with your flight number and, if you know it, your terminal.",
      "Your waiting time runs from the moment you actually land.",
      "Want your chauffeur inside arrivals with a name board? Ask for meet and greet in the notes when you book.",
      "The fare you saw before booking is the fare, tolls and gratuity included.",
    ],
    departing: [
      "Give us your flight time and we set the pickup around it.",
      "Tell us the terminal and airline so you are dropped at the right door.",
      "Travelling with more than two cases? The booking form recommends a class that fits.",
    ],
    faqs: [
      {
        question: "My international flight is running late. Do I pay for the wait?",
        answer: `No. Waiting is counted from your actual landing time, and international arrivals get 60 complimentary minutes from then. ${waitingCharge}`,
      },
      {
        question: "Can the chauffeur meet me inside the terminal?",
        answer:
          "Yes. Ask for meet and greet in the notes when you book, and your chauffeur waits inside arrivals with a name board.",
      },
      {
        question: "What does a JFK fare include?",
        answer: `On a fixed fare, tolls and gratuity are included. The fare moves only for something added to the trip — child seats at $${childSeatFee} each, an extra stop, or waiting past the complimentary window — and each appears on its own line of the invoice.`,
      },
    ],
  },
  {
    code: "LGA",
    slug: "laguardia-airport-car-service",
    name: "LaGuardia",
    metaTitle: "LaGuardia Airport Car Service",
    metaDescription:
      "Fixed-fare car service between LaGuardia (LGA) and the five boroughs. Tell us your flight and we pick you up at the right one of LaGuardia's three terminals.",
    eyebrow: "LaGuardia (LGA)",
    summary:
      "Three terminals, not all in one place. Your flight number puts the car at the right one.",
    title: "LaGuardia, at the right terminal the first time",
    intro:
      "The closest of the major airports to Midtown, on the north shore of Queens. Three terminals that are not all in the same place, and a fixed fare to or from anywhere in the city.",
    facts: [
      { label: "Where", value: "Northern Queens, on Flushing Bay" },
      { label: "Terminals", value: "A, B and C" },
      { label: "Complimentary wait", value: "45 minutes domestic · 60 international" },
    ],
    focus: {
      eyebrow: "Three terminals",
      title: "Terminal A is on its own",
      paragraphs: [
        "LaGuardia has three terminals, and they are not one building. Terminal A sits by itself on the west side of the airport, reached by its own road, while B and C are further east. A car waiting at the wrong one is a car on the wrong side of the airport.",
        "Your flight number settles it. Give it to us when you book and your chauffeur knows which arrival to meet, and which terminal to drop you at on the way out.",
      ],
    },
    arriving: [
      "Book with your flight number — it tells us which terminal you land at.",
      "Most LaGuardia flights are domestic: 45 minutes of complimentary waiting, from your actual landing.",
      "Prefer to be met inside? Ask for meet and greet in the notes when you book.",
    ],
    departing: [
      "Give us the airline and the flight so you are dropped at the right terminal.",
      "LaGuardia is close to Manhattan, but the approach roads are busy. Tell us your flight time and we set the pickup around it.",
    ],
    faqs: [
      {
        question: "I do not know which terminal I am flying into.",
        answer:
          "You do not need to. Give us your flight number when you book and we know which arrival to meet.",
      },
      {
        question: "How long will the chauffeur wait at LaGuardia?",
        answer: `On a domestic flight, 45 minutes from your actual landing; on an international one, 60. ${waitingCharge}`,
      },
      {
        question: "Can I change or cancel a LaGuardia pickup?",
        answer:
          "Call us to change it. Cancelling is free more than 6 hours before pickup; inside 6 hours the full fare applies.",
      },
    ],
  },
  {
    code: "EWR",
    slug: "newark-airport-car-service",
    name: "Newark",
    metaTitle: "Newark Airport Car Service",
    metaDescription:
      "Fixed-fare car service between Newark Liberty (EWR) and New York City, with the Hudson River tolls included in the price. Across the river, priced before you book.",
    eyebrow: "Newark Liberty (EWR)",
    summary:
      "Across the Hudson in New Jersey, with the toll already inside the fixed fare.",
    title: "Newark, with the river crossing already in the fare",
    intro:
      "Newark is in New Jersey, so every trip between it and the city crosses a toll bridge or tunnel. On a fixed fare that toll is already in the price you see before you book.",
    facts: [
      { label: "Where", value: "Newark, New Jersey" },
      { label: "Terminals", value: "A, B and C, linked by AirTrain" },
      { label: "Complimentary wait", value: "45 minutes domestic · 60 international" },
    ],
    focus: {
      eyebrow: "Crossing the Hudson",
      title: "Tolls included, not added afterwards",
      paragraphs: [
        "There is no toll-free way between Newark and New York City. From Manhattan the route runs through the Holland or Lincoln Tunnel; from Staten Island, over the Goethals Bridge. Either way there is a toll.",
        "On a fixed airport fare the toll is included. It does not appear later as a line on your invoice, and it does not change with the route your chauffeur takes.",
        "The fixed fare covers trips between Newark and the five boroughs. A trip from Newark to somewhere else in New Jersey is quoted by a person instead, and agreed before you travel.",
      ],
    },
    arriving: [
      "Book with your flight number so your waiting time counts from your actual landing.",
      "Newark handles both domestic and international flights: 45 minutes of complimentary waiting on the first, 60 on the second.",
      "Ask for meet and greet in the notes if you would like to be met inside arrivals.",
    ],
    departing: [
      "Tell us the terminal and airline so you are dropped at the right door.",
      "Leaving from Staten Island or the west side of Manhattan? Newark is often the nearer airport.",
    ],
    faqs: [
      {
        question: "Are the tolls to and from New Jersey included?",
        answer:
          "Yes, on a fixed fare. Tolls and gratuity are in the price you see before you book.",
      },
      {
        question: "I am going from Newark to an address in New Jersey. Is that a fixed fare?",
        answer:
          "No. Fixed fares cover trips between the airport and the five boroughs. Send us the trip and a person prices it; nothing is charged until you agree it.",
      },
      {
        question: "Is Newark priced the same as JFK?",
        answer:
          "Each airport has its own line on the rate card. The Newark fare for each vehicle is on this page, and it is the fare you pay.",
      },
    ],
  },
  {
    code: "TEB",
    slug: "teterboro-airport-car-service",
    name: "Teterboro",
    metaTitle: "Teterboro Airport Car Service",
    metaDescription:
      "Chauffeured transfers between Teterboro (TEB) and New York City for private flights. Tell us the FBO and tail number, and your car meets the aircraft's schedule.",
    eyebrow: "Teterboro (TEB)",
    summary:
      "Private and business aviation. We meet you at the FBO, not a terminal.",
    title: "Teterboro, for flights that do not keep an airline's schedule",
    intro:
      "Teterboro handles private and business aviation only — no airlines, no terminal building. A car between the FBO and the city, with the discretion the flight was chartered for.",
    facts: [
      { label: "Where", value: "Bergen County, New Jersey" },
      { label: "Serves", value: "Private and business aviation only" },
      { label: "Terminal", value: "None — each FBO has its own lounge" },
    ],
    focus: {
      eyebrow: "Private aviation",
      title: "The FBO is the terminal",
      paragraphs: [
        "At Teterboro there is no airline terminal to meet you at. Passengers arrive and leave through the FBO — the fixed-base operator that handles the aircraft — and each one has its own lounge and its own kerb.",
        "So the two things we need are the FBO and the tail number. Put the tail number where the form asks for a flight number, and the FBO in the notes, and your chauffeur goes to the right door.",
        "Conversations, routes and passenger details stay in the car. Nothing about who flew, or where they went, is shared or discussed between bookings.",
      ],
    },
    arriving: [
      "Book with the tail number and the FBO handling the aircraft.",
      "Private arrival times move. Call us the moment yours does.",
      "The fare from Teterboro to the five boroughs is fixed where it is published below, tolls and gratuity included.",
    ],
    departing: [
      "Give us the wheels-up time and the FBO, and we set the pickup around it.",
      "Tell us about luggage, golf bags or anything unusual when you book, so the right vehicle turns up.",
    ],
    faqs: [
      {
        question: "What do I give you instead of a flight number?",
        answer:
          "The tail number, in the flight number field, and the name of the FBO in the notes. That is enough for your chauffeur to find you.",
      },
      {
        question: "What happens if the flight is cancelled?",
        answer:
          "Cancelling is free more than 6 hours before pickup. Inside 6 hours the full fare applies, because the car and chauffeur are already committed to you.",
      },
      {
        question: "Will details of my trip be shared?",
        answer:
          "No. Conversations, routes and passenger details stay in the car, and are not shared, logged for marketing, or discussed between bookings.",
      },
    ],
  },
  {
    code: "HPN",
    slug: "westchester-airport-car-service",
    name: "Westchester",
    metaTitle: "Westchester Airport (HPN) Car Service",
    metaDescription:
      "Car service between Westchester County Airport (HPN) and New York City. Fixed fares to the five boroughs; trips within Westchester are quoted before you travel.",
    eyebrow: "Westchester County (HPN)",
    summary:
      "North of the city. Fixed into the five boroughs, quoted around Westchester.",
    title: "Westchester County Airport, between the city and the suburbs",
    intro:
      "A single-terminal airport north of the city, near White Plains. A fixed fare to or from the five boroughs; a quoted one for anywhere in Westchester itself.",
    facts: [
      { label: "Where", value: "Near White Plains, Westchester County" },
      { label: "Terminal", value: "One passenger terminal" },
      { label: "Complimentary wait", value: "45 minutes domestic" },
    ],
    focus: {
      eyebrow: "Where the fixed fare ends",
      title: "Into the city is fixed. Around Westchester is quoted.",
      paragraphs: [
        "Westchester County Airport sits just outside the fixed-fare area. A trip between HPN and any address in the five boroughs is priced from the rate card, and you see that fare before you book.",
        "A trip between HPN and somewhere in Westchester, Connecticut or elsewhere outside the city is quoted by a person. You send the details, we come back with a price, and nothing is charged until you accept it.",
        "There is one passenger terminal, so there is no wrong door to wait at. Your flight number is still what tells us when you land.",
      ],
    },
    arriving: [
      "Book with your flight number so your waiting time runs from your actual landing.",
      "Ask for meet and greet in the notes if you would like your chauffeur inside.",
      "Heading to the Bronx or Manhattan? That is a fixed fare, shown before you book.",
    ],
    departing: [
      "Leaving from the northern Bronx? Westchester can be the nearer airport.",
      "Leaving from a Westchester address? Send it through the quote form and we price the trip.",
    ],
    faqs: [
      {
        question: "Is there a fixed fare from my home in Westchester?",
        answer:
          "No. Fixed airport fares cover the five boroughs. A trip from a Westchester address is quoted by a person and agreed before you travel.",
      },
      {
        question: "How long will the chauffeur wait if my flight is delayed?",
        answer: `On a domestic flight, 45 minutes from your actual landing time. ${waitingCharge}`,
      },
      {
        question: "Are tolls included?",
        answer:
          "On a fixed fare, yes, with gratuity. On a quoted trip, tolls and parking are added at cost only where they were not already in the price we gave you.",
      },
    ],
  },
];

/** The page for an airport code, if it has one. */
export function airportPageHref(code: string): string | null {
  const page = airportPages.find((item) => item.code === code);
  return page ? `/${page.slug}` : null;
}

export function airportPage(code: string): AirportPageContent {
  const page = airportPages.find((item) => item.code === code);
  if (!page) throw new Error(`No airport page for ${code}`);
  return page;
}
