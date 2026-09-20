import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading } from "@/components/ui/section";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What RSSkyler Limo collects when you book or request a quote, why we hold it, how long we keep it, and how to have it removed.",
};

/** Reviewed alongside the terms; change both together. */
const LAST_UPDATED = "17 September 2026";

/**
 * Written against what the system actually does.
 *
 * Every claim below is checkable in the codebase: the fields are the columns in
 * `bookings` and `quotes`, the retention windows are real, and the third-party
 * list is exactly the services the apps call. A policy that describes an
 * imagined system is worse than none — it is a promise nobody is keeping.
 */

const collected = [
  {
    term: "Name, phone number and email address",
    detail:
      "So a chauffeur can reach you at the kerb and we can contact you about the trip. The phone number is also the second factor when you look a booking up — a reference alone will not open it.",
  },
  {
    term: "Pickup and drop-off addresses",
    detail:
      "Including any stops, and the airport and flight details on an airport transfer. These reach the chauffeur driving you and the staff arranging the trip.",
  },
  {
    term: "Trip details",
    detail:
      "Date, time, passengers, bags, child seats, vehicle class, what the trip is for, and anything you write in the notes.",
  },
  {
    term: "Company name, on a corporate enquiry",
    detail: "Only when you provide it. It is optional on every form.",
  },
  {
    term: "A review, if you choose to leave one",
    detail:
      "Your rating, what you write, and the name you want shown (or your first name and last initial if you leave it blank). It is tied to your booking so only a real customer can review, and it is published only after a member of our team approves it.",
  },
  {
    term: "Payment details",
    detail:
      "Card details are entered with our payment processor and are never stored on our systems. We keep the authorisation reference and the last four digits, which is what appears on your invoice.",
  },
];

const notCollected = [
  "We do not sell your details, and we do not share them with anyone for their own marketing.",
  "We do not add you to a mailing list because you booked a car. Marketing email, if we ever send it, is opt-in and separate.",
  "We do not build a profile of you across other websites, and we run no advertising trackers.",
  "We do not ask for anything we have no use for. There is no date of birth field and no identity document upload.",
];

const thirdParties = [
  {
    name: "Google Places",
    what: "Address autocomplete in the booking form.",
    detail:
      "What you type into an address box is sent to Google to return suggestions. It is proxied through our own server, so Google does not receive your IP address or a cookie from this site. Nothing else on the form is sent.",
  },
  {
    name: "Google, if you choose to review us there",
    what: "An optional review on Google.",
    detail:
      "After you send a review to us we may offer a link to Google's own review form. Following it takes you to Google, where its terms and privacy policy apply. We send Google nothing about you or your booking.",
  },
  {
    name: "Our payment processor",
    what: "Taking payment.",
    detail:
      "Card details go directly to the processor and never touch our servers. We receive only a reference and the last four digits.",
  },
  {
    name: "Our hosting provider",
    what: "Running the website and the database.",
    detail:
      "The site, the database and the backups sit on servers we rent. Nobody else has access to them.",
  },
];

const retention = [
  {
    what: "Bookings and quote requests",
    how: "Seven years",
    why: "They are financial records, and tax rules require them to be kept.",
  },
  {
    what: "Notes you write on a booking",
    how: "With the booking",
    why: "They are part of the record of what was arranged.",
  },
  {
    what: "Reviews",
    how: "With the booking",
    why: "A review belongs to the trip it describes. A published review can be removed if you ask us to.",
  },
  {
    what: "Staff sign-in sessions",
    how: "Cleared on expiry",
    why: "Expired sessions are deleted automatically every hour.",
  },
];

const rights = [
  "Ask what we hold about you, and get a copy.",
  "Have anything inaccurate corrected.",
  "Have your details deleted, except where a financial record must be kept.",
  "Object to how we use your details, or ask us to restrict it.",
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy policy"
        title="What we hold about you, and why"
        intro="Discretion is one of our values, so it is worth writing down what it means in practice rather than asserting it. This describes what the booking system actually does."
      />

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="What we collect"
            title="Only what a trip needs"
            intro="Everything below comes from a form you filled in. There is no hidden collection behind it."
            data-reveal
          />
        </Reveal>

        <Reveal className="mt-12">
          <dl data-reveal className="flex flex-col">
            {collected.map((item) => (
              <div
                key={item.term}
                className="grid gap-2 border-t border-midnight/10 py-6 md:grid-cols-12 md:gap-8"
              >
                <dt className="font-sans text-[17px] font-semibold text-midnight md:col-span-4">
                  {item.term}
                </dt>
                <dd className="text-[15px] leading-[1.7] text-charcoal md:col-span-8">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Section>

      <Section tone="dark">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="What we do not do"
            title="The absences matter as much as the list"
            data-reveal
          />
          <ul
            data-reveal
            className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2"
          >
            {notCollected.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-[1.7] text-white/75">
                <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section tone="grey">
        <Reveal>
          <SectionHeading
            eyebrow="Who else sees it"
            title="Three services, and what each one gets"
            intro="This is the complete list. If it ever grows, this page changes on the same day."
            data-reveal
          />
        </Reveal>

        <Reveal className="mt-12 grid gap-8 md:grid-cols-3">
          {thirdParties.map((party) => (
            <div
              key={party.name}
              data-reveal
              className="border-t border-midnight/15 pt-6"
            >
              <h3 className="font-sans text-[17px] font-semibold text-midnight">
                {party.name}
              </h3>
              <p className="mt-2 font-sans text-[13px] tracking-[0.08em] text-charcoal/70 uppercase">
                {party.what}
              </p>
              <p className="mt-4 text-[15px] leading-[1.7] text-charcoal">
                {party.detail}
              </p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section tone="light">
        <Reveal>
          <SectionHeading
            eyebrow="How long we keep it"
            title="Until the record stops being needed"
            data-reveal
          />

          <div data-reveal className="relative mt-10 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">Retention periods</caption>
              <thead>
                <tr className="border-b border-midnight/15">
                  <th
                    scope="col"
                    className="py-3 pr-6 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    What
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-6 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    How long
                  </th>
                  <th
                    scope="col"
                    className="py-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    Why
                  </th>
                </tr>
              </thead>
              <tbody>
                {retention.map((row) => (
                  <tr key={row.what} className="border-b border-midnight/10">
                    <th
                      scope="row"
                      className="py-5 pr-6 align-top font-sans text-[15px] font-semibold text-midnight"
                    >
                      {row.what}
                    </th>
                    <td className="py-5 pr-6 align-top font-sans text-[15px] font-medium text-midnight tabular-nums">
                      {row.how}
                    </td>
                    <td className="py-5 align-top text-[15px] leading-[1.7] text-charcoal">
                      {row.why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      <Section tone="grey">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              eyebrow="Cookies"
              title="None that follow you"
              intro="The public site sets no analytics or advertising cookies. The only cookie in the system is the one that keeps a member of staff signed in to the reservations dashboard, which is a different site you will never see."
              data-reveal
            />
          </Reveal>

          <Reveal y={30}>
            <div data-reveal>
              <SectionHeading
                eyebrow="Your rights"
                title="What you can ask us to do"
                data-reveal
              />
              <ul className="mt-8 flex flex-col gap-3">
                {rights.map((right) => (
                  <li
                    key={right}
                    className="flex gap-3 text-[15px] leading-[1.7] text-charcoal"
                  >
                    <span
                      aria-hidden
                      className="mt-2.5 h-px w-4 shrink-0 bg-gold"
                    />
                    {right}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[15px] leading-[1.7] text-charcoal">
                Ask by phone or by email and we will action it. We do not
                require a form.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <section className="bg-midnight">
        <Container className="py-20 md:py-24">
          <Reveal>
            <h2
              data-reveal
              className="font-display max-w-2xl text-[26px] leading-tight font-semibold text-white md:text-[34px]"
            >
              Any question about your details, put to a person.
            </h2>
            <p
              data-reveal
              className="mt-5 max-w-2xl text-[17px] leading-[1.7] text-white/75"
            >
              Write to{" "}
              <a
                href={`mailto:${contact.email}`}
                className="text-white underline underline-offset-4"
              >
                {contact.email}
              </a>{" "}
              or call us. If you would rather read what you are agreeing to when
              you book, that is in the{" "}
              <Link
                href="/terms"
                className="text-white underline underline-offset-4"
              >
                terms and conditions
              </Link>
              .
            </p>

            <div data-reveal className="mt-10 flex flex-wrap items-center gap-6">
              <ButtonLink href="/book" variant="cta">
                Book a car
              </ButtonLink>
              <a
                href={contact.phoneHref}
                /* inline-block + padding: a standalone call action deserves a
                 real tap target, unlike a link inside a sentence. */
              className="inline-block py-2 text-[17px] text-white underline-offset-4 tabular-nums hover:underline"
              >
                {contact.phone}
              </a>
            </div>

            <p data-reveal className="mt-12 text-[13px] text-white/55">
              Last updated{" "}
              <span className="tabular-nums">{LAST_UPDATED}</span>. This policy
              describes the system as it is built today.
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
