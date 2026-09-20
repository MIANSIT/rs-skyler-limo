import "server-only";

import { unstable_cache } from "next/cache";

import { apiFetch } from "@/lib/api/client";
import type { HeroMediaItem } from "@/lib/api/types";

/**
 * The hero's background slides, cached under their own `hero` tag —
 * deliberately separate from `fleet` so editing one never busts the other's
 * cache. The admin app clears this tag through `/api/revalidate` the moment
 * an operator saves a slide.
 */
export const getHeroMedia = unstable_cache(
  async (): Promise<HeroMediaItem[]> => {
    const { media } = await apiFetch<{ media: HeroMediaItem[] }>("/api/hero");
    return media;
  },
  ["hero-media"],
  { tags: ["hero"], revalidate: 3600 },
);

/**
 * An empty list — not a thrown error — is what makes the hero fall back to
 * its plain midnight background, both when nothing has been uploaded yet and
 * when the API is briefly unreachable.
 */
export async function getHeroMediaSafely(): Promise<HeroMediaItem[]> {
  try {
    return await getHeroMedia();
  } catch (error) {
    console.error("Could not load hero media:", error);
    return [];
  }
}
