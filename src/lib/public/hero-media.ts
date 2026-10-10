import "server-only";

import { unstable_cache } from "next/cache";

import { apiFetch } from "@/lib/api/client";
import type { HeroMediaItem, HeroText } from "@/lib/api/types";

export type HeroContent = { media: HeroMediaItem[]; text: HeroText };

/**
 * What the hero says when the API cannot be reached. The same wording the API
 * serves until an operator saves something else, so an outage looks unchanged.
 */
export const DEFAULT_HERO_TEXT: HeroText = {
  eyebrow: "Premium chauffeur service · New York City",
  headline: "Arrive in Style",
  lineOne:
    "Luxury chauffeur service throughout New York City, Westchester, New Jersey & Connecticut.",
  lineTwo: "Airport Transfers • Corporate Travel • Special Events",
};

/**
 * The hero's background slides and wording, cached under their own `hero` tag —
 * deliberately separate from `fleet` so editing one never busts the other's
 * cache. The admin app clears this tag through `/api/revalidate` the moment
 * an operator saves a slide or the hero text.
 */
export const getHeroContent = unstable_cache(
  async (): Promise<HeroContent> => {
    const { media, text } = await apiFetch<{
      media: HeroMediaItem[];
      text?: HeroText;
    }>("/api/hero");
    return { media, text: text ?? DEFAULT_HERO_TEXT };
  },
  ["hero-content"],
  { tags: ["hero"], revalidate: 3600 },
);

/**
 * An empty slide list and the default wording — not a thrown error — is what
 * keeps the hero rendering, on a plain midnight background, both when nothing
 * has been uploaded yet and when the API is briefly unreachable.
 */
export async function getHeroContentSafely(): Promise<HeroContent> {
  try {
    return await getHeroContent();
  } catch (error) {
    console.error("Could not load hero content:", error);
    return { media: [], text: DEFAULT_HERO_TEXT };
  }
}
