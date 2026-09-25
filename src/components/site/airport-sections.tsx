import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { Faq } from "@/components/site/home-sections";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { PlaneIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import {
  airportPageHref,
  airportPages,
  type AirportPageContent,
} from "@/lib/airport-pages";
import type { BookingOptions, FleetVehicle } from "@/lib/api/types";
import { childSeatFee, contact, formatFare } from "@/lib/content";
import { CtaBand } from "@/components/site/cta-band";

const th =
  "py-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase";

/**
 * One airport's fares, read from the same rate card `decideFare` prices
 * against. A vehicle with no published rate says so rather than disappearing,
 * so the table matches what the booking form will do with it: quote it.
 */
export function AirportRateTable({
  code,
  name,
  fleet,
  options,
}: {
  code: string;
  name: string;
  fleet: FleetVehicle[];
  options: BookingOptions;
}) {
  // An empty airport list means the API could not be reached, not that the
  // airport is gone — the fallback there is the phone, not "not offered".
  const reachable = options.airports.length > 0 && fleet.length > 0;
  const active = options.airports.some((airport) => airport.code === code);
  const rates = options.rates.filter((rate) => rate.airportCode === code);

  if (!reachable) {
    return (
      <p className="max-w-2xl text-[15px] leading-[1.7] text-charcoal">
        Fares are not loading right now. Call{" "}
        <a
          href={contact.phoneHref}
          className="font-medium text-midnight tabular-nums underline underline-offset-4"
        >
          {contact.phone}
        </a>{" "}
        and we will give you the {name} fare for your vehicle.
      </p>
    );
  }

  if (!active || rates.length === 0) {
    return (
      <p className="max-w-2xl text-[15px] leading-[1.7] text-charcoal">
        {name} transfers are priced on request at the moment. Send us the trip
        and a person comes back with a fare — nothing is charged until you
        agree it.
      </p>
    );
  }

  return (
    <div tabIndex={0} role="region" aria-label={`${name} fares`} className="relative overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-left">
        <caption className="sr-only">
          Fixed fares between {name} and the five boroughs
        </caption>
        <thead>
          <tr className="border-b border-midnight/15">
            <th scope="col" className={`${th} pr-6`}>
              Vehicle
            </th>
            <th scope="col" className={`${th} pr-6`}>
              Seats · bags
            </th>
            <th scope="col" className={`${th} text-right`}>
              Fixed fare
            </th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((vehicle) => {
            const rate = rates.find((r) => r.vehicleSlug === vehicle.slug);
            return (
              <tr
                key={vehicle.slug}
                className="border-b border-midnight/10 last:border-0"
              >
                <th
                  scope="row"
                  className="py-4 pr-6 align-top font-sans text-[15px] font-semibold text-midnight"
                >
                  <Link
                    href={`/fleet#${vehicle.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {vehicle.name}
                  </Link>
                </th>
                <td className="py-4 pr-6 align-top text-[15px] text-charcoal tabular-nums">
                  {vehicle.passengerCapacity} · {vehicle.luggageCapacity}
                </td>
                <td className="py-4 text-right align-top font-sans text-[17px] font-semibold text-midnight tabular-nums">
                  {rate ? (
                    formatFare(rate.priceCents)
                  ) : (
                    <span className="text-[15px] font-normal text-charcoal">
                      On request
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Every airport against every vehicle — the hub's version of the table above.
 * Airports come from the dashboard, so one added there appears here; it links
 * to a page only if it has one.
 */
export function AirportRateGrid({
  fleet,
  options,
}: {
  fleet: FleetVehicle[];
  options: BookingOptions;
}) {
  if (options.airports.length === 0 || fleet.length === 0) {
    return (
      <p className="max-w-2xl text-[15px] leading-[1.7] text-charcoal">
        The rate card is not loading right now. Call{" "}
        <a
          href={contact.phoneHref}
          className="font-medium text-midnight tabular-nums underline underline-offset-4"
        >
          {contact.phone}
        </a>{" "}
        for the fare on any airport and vehicle.
      </p>
    );
  }

  return (
    <div tabIndex={0} role="region" aria-label="Airport rate card" className="relative overflow-x-auto">
      <table
        className="w-full border-collapse text-left"
        style={{ minWidth: `${14 + fleet.length * 9}rem` }}
      >
        <caption className="sr-only">
          Fixed airport fares by vehicle, between each airport and the five
          boroughs
        </caption>
        <thead>
          <tr className="border-b border-midnight/15">
            <th scope="col" className={`${th} pr-6`}>
              Airport
            </th>
            {fleet.map((vehicle) => (
              <th
                key={vehicle.slug}
                scope="col"
                className={`${th} pr-6 text-right last:pr-0`}
              >
                {vehicle.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {options.airports.map((airport) => {
            const href = airportPageHref(airport.code);
            return (
              <tr
                key={airport.code}
                className="border-b border-midnight/10 last:border-0"
              >
                <th
                  scope="row"
                  className="py-4 pr-6 align-top font-sans text-[15px] font-semibold text-midnight"
                >
                  {href ? (
                    <Link
                      href={href}
                      className="underline underline-offset-4"
                    >
                      {airport.name}
                    </Link>
                  ) : (
                    airport.name
                  )}
                </th>
                {fleet.map((vehicle) => {
                  const rate = options.rates.find(
                    (r) =>
                      r.airportCode === airport.code &&
                      r.vehicleSlug === vehicle.slug,
                  );
                  return (
                    <td
                      key={vehicle.slug}
                      className="py-4 pr-6 text-right align-top font-sans text-[16px] font-semibold text-midnight tabular-nums last:pr-0"
                    >
                      {rate ? (
                        formatFare(rate.priceCents)
                      ) : (
                        <span className="text-[14px] font-normal text-charcoal">
                          On request
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Gold as a short rule before each line — a graphic, not text. */
function DashList({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul
      className={`flex flex-col gap-4 text-[15px] leading-[1.7] ${dark ? "text-white/80" : "text-charcoal"}`}
    >
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-3 h-px w-4 shrink-0 bg-gold" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The layout every airport page shares. The words are all per-airport (see
 * `airport-pages.ts`); only the order of the sections is common.
 */
export function AirportPage({
  page,
  fleet,
  options,
}: {
  page: AirportPageContent;
  fleet: FleetVehicle[];
  options: BookingOptions;
}) {
  const others = airportPages.filter((item) => item.code !== page.code);

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.title} intro={page.intro} />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-7">
            <SectionHeading
              eyebrow={page.focus.eyebrow}
              title={page.focus.title}
              data-reveal
            />
            <div data-reveal className="mt-8 flex max-w-2xl flex-col gap-5">
              {page.focus.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[16px] leading-[1.7] text-charcoal"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5">
            <dl data-reveal className="flex flex-col">
              {page.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="border-t border-midnight/15 py-4 last:border-b"
                >
                  <dt className="font-sans text-[13px] font-medium tracking-[0.12em] text-charcoal/70 uppercase">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-sans text-[17px] font-semibold text-midnight">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Fares"
            title={`${page.name} fares, before you book`}
            intro={`Between ${page.name} and any address in the five boroughs, in either direction. Tolls and gratuity are included; child seats are $${childSeatFee} each.`}
            data-reveal
          />
          <div data-reveal className="mt-10">
            <AirportRateTable
              code={page.code}
              name={page.name}
              fleet={fleet}
              options={options}
            />
          </div>
          <div
            data-reveal
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            {/* The page's one gold action. */}
            <ButtonLink href="/book" variant="cta" size="lg">
              Book a {page.name} transfer
            </ButtonLink>
            <Link
              href="/quote"
              className="py-2 font-sans text-[15px] font-medium text-midnight underline underline-offset-4"
            >
              Going beyond the five boroughs? Get a quote
            </Link>
          </div>
        </Reveal>
      </Section>

      <Section tone="dark">
        <div className="grid gap-14 md:grid-cols-2 md:gap-20">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Arriving"
              title={`Landing at ${page.name}`}
              data-reveal
            />
            <div data-reveal className="mt-8">
              <DashList items={page.arriving} dark />
            </div>
          </Reveal>
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Departing"
              title={`Flying from ${page.name}`}
              data-reveal
            />
            <div data-reveal className="mt-8">
              <DashList items={page.departing} dark />
            </div>
          </Reveal>
        </div>
      </Section>

      <Faq
        tone="light"
        items={page.faqs}
        eyebrow={`${page.name} questions`}
        title="Worth knowing first"
        intro="Each answer matches our terms."
      />

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Other airports"
            title="Flying from somewhere else?"
            data-reveal
          />
          <ul
            data-reveal
            className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {others.map((other) => (
              <li
                key={other.code}
                className="flex items-center gap-3 border-t border-midnight/15 py-4"
              >
                <PlaneIcon className="h-5 w-5 shrink-0 text-gold" />
                <Link
                  href={`/${other.slug}`}
                  className="font-sans text-[16px] font-medium text-midnight underline-offset-4 hover:underline"
                >
                  {other.eyebrow}
                </Link>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-8 text-[15px] leading-[1.7] text-charcoal">
            Or see{" "}
            <Link
              href="/airport-transportation"
              className="font-medium text-midnight underline underline-offset-4"
            >
              every airport and fare
            </Link>{" "}
            on one page.
          </p>
        </Reveal>
      </Section>

      <CtaBand />
    </>
  );
}
