import Image from "next/image";

import { Reveal } from "@/components/motion/reveal";
import { ShieldIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";

/**
 * The NYC Taxi & Limousine Commission 2024 Safety Honor Roll certificate
 * (`public/achivement1.webp`), with the client's own wording beside it. The
 * claim is the client's; the certificate is the evidence, so it is shown whole
 * rather than cropped to the badge.
 */
export function Achievement({ tone }: { tone: "deep" | "dark" }) {
  return (
    <Section tone={tone}>
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Achievement"
            title="Recognized for Safety & Excellence"
            intro="RS Skyler Limo is proudly led by a chauffeur recognized on the NYC Taxi & Limousine Commission’s 2024 Safety Honor Roll for a commitment to safety behind the wheel."
            data-reveal
          />
          <p
            data-reveal
            className="mt-8 flex items-start gap-3 font-sans text-[13px] tracking-widest text-white/70 uppercase"
          >
            <ShieldIcon className="h-5 w-5 shrink-0 text-gold" />
            Professional Service &bull; Safety First &bull; Exceptional Experience
          </p>
        </Reveal>

        <Reveal y={34}>
          <div data-reveal className="border border-gold/40 p-2">
            <Image
              src="/achivement1.webp"
              alt="Certificate of Achievement from the NYC Taxi & Limousine Commission: added to the 2024 Safety Honor Roll in recognition of a commitment to safety behind the wheel, dated June 4, 2024."
              width={1536}
              height={1024}
              sizes="(max-width: 1024px) 100vw, 560px"
              className="h-auto w-full"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
