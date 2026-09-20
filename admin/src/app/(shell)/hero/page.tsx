import type { Metadata } from "next";

import { HeroMediaManager } from "@/components/admin/hero-media-manager";
import { getHeroMedia } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Hero slider" };

export default async function HeroPage() {
  const media = await getHeroMedia();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Hero slider
        </h1>
        <p className="mt-2 font-sans text-[15px] text-charcoal/70">
          The background images and video behind the homepage booking form.
        </p>
      </div>

      <HeroMediaManager media={media} />
    </div>
  );
}
