import type { Metadata } from "next";

import { HeroMediaManager } from "@/components/admin/hero-media-manager";
import { HeroTextForm } from "@/components/admin/hero-text-form";
import { getHeroMedia, getHeroText } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Hero" };

export default async function HeroPage() {
  const [media, text] = await Promise.all([getHeroMedia(), getHeroText()]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Hero
        </h1>
        <p className="mt-2 font-sans text-[15px] text-charcoal/70">
          The wording and the background images and video at the top of the homepage.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-semibold text-midnight">Hero text</h2>
        <HeroTextForm text={text} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] font-semibold text-midnight">
          Background slider
        </h2>
        <HeroMediaManager media={media} />
      </section>
    </div>
  );
}
