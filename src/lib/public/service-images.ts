import "server-only";

import { unstable_cache } from "next/cache";

import { apiFetch } from "@/lib/api/client";

export type ServiceImage = {
  slug: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
};

/**
 * The photos an operator uploaded for the service cards, cached under their own
 * `service-images` tag. The admin app clears it through `/api/revalidate` the
 * moment a photo is saved or removed.
 */
const getServiceImages = unstable_cache(
  async (): Promise<ServiceImage[]> => {
    const { images } = await apiFetch<{ images: ServiceImage[] }>("/api/service-images");
    return images;
  },
  ["service-images"],
  { tags: ["service-images"], revalidate: 3600 },
);

/** An outage means the cards keep their existing photos, not an error page. */
export async function getServiceImagesSafely(): Promise<ServiceImage[]> {
  try {
    return await getServiceImages();
  } catch (error) {
    console.error("Could not load service photos:", error);
    return [];
  }
}
