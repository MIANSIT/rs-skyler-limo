import type { Metadata } from "next";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PlaneIcon } from "@/components/ui/icon";
import {
  RationaleNote,
  Rule,
  Section,
  SectionHeading,
} from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Style guide",
  description:
    "Every RSSkyler Limo component in one place, checked against the Brand Guidelines, Edition 02, 2026.",
  robots: { index: false, follow: false },
};

const palette = [
  { name: "Midnight Blue", hex: "#0B2142", role: "Primary · ~60%", swatch: "bg-midnight" },
  { name: "Accent Gold", hex: "#D4A017", role: "Accent · ~10%", swatch: "bg-gold" },
  { name: "Charcoal", hex: "#2C2C2F", role: "Secondary text & UI", swatch: "bg-charcoal" },
  { name: "Pure White", hex: "#FFFFFF", role: "Background · ~30%", swatch: "bg-white border border-midnight/15" },
  { name: "Light Grey", hex: "#F5F5F5", role: "Panels & secondary grounds", swatch: "bg-grey border border-midnight/15" },
];

const contrast = [
  ["Midnight on white", "16.0:1", "AAA — any size"],
  ["White on midnight", "16.0:1", "AAA — any size"],
  ["Charcoal on white", "13.9:1", "AAA — any size"],
  ["Midnight on light grey", "14.7:1", "AAA — any size"],
  ["Gold on midnight", "6.8:1", "AA — safe for body and UI text"],
  ["Midnight on gold", "9.9:1", "AAA — the CTA pairing"],
  ["Gold on white", "2.4:1", "Fails at every size — graphic use only"],
];

export default function StyleguidePage() {
  return (
    <>
      <Section tone="dark">
        <p className="font-sans text-[13px] font-medium tracking-[0.16em] text-gold uppercase">
          Internal reference
        </p>
        <h1 className="font-display mt-5 text-[34px] font-semibold text-white md:text-[44px]">
          Style guide
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.7] text-white/75">
          Every component, checked against the Brand Guidelines, Edition 02,
          2026. If something on the site does not appear here, it has not been
          approved yet.
        </p>
      </Section>

      <Section tone="light">
        <SectionHeading eyebrow="02" title="Colour" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {palette.map((colour) => (
            <div key={colour.name}>
              <div className={`h-24 w-full ${colour.swatch}`} />
              <p className="font-sans mt-4 text-[15px] font-semibold text-midnight">
                {colour.name}
              </p>
              <p className="mt-1 text-[13px] text-charcoal tabular-nums">
                {colour.hex}
              </p>
              <p className="mt-1 text-[13px] text-charcoal/70">{colour.role}</p>
            </div>
          ))}
        </div>

        <h3 className="font-sans mt-14 text-[17px] font-semibold text-midnight">
          Verified contrast
        </h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-midnight/15">
                {["Combination", "Ratio", "Verdict"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="pb-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contrast.map(([combination, ratio, verdict]) => (
                <tr key={combination} className="border-b border-midnight/10">
                  <th
                    scope="row"
                    className="py-3 font-sans text-[15px] font-normal text-midnight"
                  >
                    {combination}
                  </th>
                  <td className="py-3 text-[15px] text-charcoal tabular-nums">
                    {ratio}
                  </td>
                  <td className="py-3 text-[15px] text-charcoal">{verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="grey">
        <SectionHeading eyebrow="03" title="Typography" />
        <div className="mt-10 flex flex-col gap-8 bg-white p-8">
          <div>
            <Label>H1 · Fraunces Semibold · 34–40px</Label>
            <p className="font-display text-[34px] font-semibold text-midnight md:text-[40px]">
              Arrive in Style
            </p>
          </div>
          <Rule />
          <div>
            <Label>H2 · Fraunces Semibold · 22–26px</Label>
            <p className="font-display text-[22px] font-semibold text-midnight md:text-[26px]">
              Premium Chauffeur Service in New York City
            </p>
          </div>
          <Rule />
          <div>
            <Label>H3 · Public Sans Semibold · 16–18px</Label>
            <p className="font-sans text-[17px] font-semibold text-midnight">
              Airport transfers, flight-tracked
            </p>
          </div>
          <Rule />
          <div>
            <Label>Body · Public Sans Regular · 15–16px / 1.7</Label>
            <p className="max-w-xl text-[15px] leading-[1.7] text-charcoal md:text-base">
              RSSkyler Limo provides seamless, reliable chauffeured
              transportation. Book your ride in seconds and experience
              professional service with every journey.
            </p>
          </div>
          <Rule />
          <div>
            <Label>UI label · Public Sans Medium · 12–13px</Label>
            <p className="font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/70 uppercase">
              Pickup time
            </p>
          </div>
          <Rule />
          <div>
            <Label>Rationale · Fraunces Italic · 15–17px</Label>
            <p className="font-display text-[16px] text-charcoal italic">
              Serif headlines evoke premium heritage; sans body keeps the
              booking flow easy to scan on a phone at a curb.
            </p>
          </div>
          <Rule />
          <div>
            <Label>Tabular figures · fares, times, invoices</Label>
            <p className="font-sans text-[17px] text-midnight tabular-nums">
              $95.00 · $135.00 · $185.00 · $240.00 · 6:00 a.m.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeading eyebrow="05.1" title="Wordmark" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex h-40 items-center justify-center border border-midnight/10 bg-white">
            <Wordmark tone="light" size="lg" />
          </div>
          <div className="flex h-40 items-center justify-center bg-midnight">
            <Wordmark tone="dark" size="lg" />
          </div>
        </div>
        <p className="mt-5 text-[15px] leading-[1.7] text-charcoal">
          One word, two weights, a single baseline, 4.8% tracking. Live text —
          there is no approved logo mark yet.
        </p>
      </Section>

      <Section tone="grey">
        <SectionHeading eyebrow="09" title="Buttons" />
        <div className="mt-10 flex flex-wrap items-center gap-4 bg-white p-8">
          <Button variant="primary">Primary button</Button>
          <Button variant="secondary">Secondary button</Button>
          <Button variant="cta">Book now</Button>
          <a
            href="#"
            className="font-sans text-[15px] text-midnight underline-offset-4 hover:underline"
          >
            Track your ride
          </a>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <p className="mt-5 text-[15px] leading-[1.7] text-charcoal">
          The CTA carries <strong className="font-semibold">midnight</strong>{" "}
          text on gold — 9.9:1. White on gold measures ~1.9:1 and is never used.
          One gold action per view.
        </p>
      </Section>

      <Section tone="light">
        <SectionHeading eyebrow="09" title="Form controls" />
        <div className="mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field label="Pickup" id="sg-pickup">
            <Input id="sg-pickup" placeholder="Address or landmark" />
          </Field>
          <Field label="Vehicle class" id="sg-vehicle">
            <Select id="sg-vehicle">
              <option>Luxury Sedan</option>
              <option>Luxury SUV</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" id="sg-notes" hint="Anything the driver should know.">
              <Textarea id="sg-notes" />
            </Field>
          </div>
        </div>

        <h3 className="font-sans mt-14 text-[17px] font-semibold text-midnight">
          States
        </h3>
        <div className="mt-5 flex flex-col gap-3">
          <p className="border-l-2 border-green-700 bg-green-700/5 px-4 py-3 text-[15px] text-green-800">
            Confirmed for 6:00 a.m. See you then.
          </p>
          <p className="border-l-2 border-red-700 bg-red-700/5 px-4 py-3 text-[15px] text-red-800">
            We could not find that booking reference. Check the confirmation
            email, or call dispatch.
          </p>
        </div>
      </Section>

      <Section tone="grey">
        <SectionHeading eyebrow="Devices" title="Panels & icons" />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <RationaleNote label="Why this palette">
            Midnight blue signals trust and professionalism without the coldness
            of black. Gold adds luxury in small, deliberate doses rather than
            ostentation.
          </RationaleNote>
          <div className="flex items-center gap-6 bg-white p-6">
            <PlaneIcon className="h-6 w-6 text-gold" />
            <div className="bg-midnight p-4">
              <PlaneIcon className="h-6 w-6 text-gold" />
            </div>
            <p className="text-[13px] leading-[1.6] text-charcoal">
              Gold as an icon is a graphic element, permitted on both grounds.
              Gold as a <em>sentence</em> is permitted only on midnight or
              charcoal.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-sans text-[13px] font-medium tracking-[0.08em] text-charcoal/60 uppercase">
      {children}
    </p>
  );
}
