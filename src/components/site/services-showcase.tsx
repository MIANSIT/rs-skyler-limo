import fs from "node:fs";
import path from "node:path";

import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { Reveal } from "@/components/motion/reveal";
import { ArrowRightIcon } from "@/components/ui/icon";
import { Section, SectionHeading } from "@/components/ui/section";
import { services, type Service } from "@/lib/content";
import { getServiceImagesSafely, type ServiceImage } from "@/lib/public/service-images";

type Photo = { url: string; alt: string };

const PHOTO_EXTENSIONS = ["jpg", "jpeg", "webp", "png"];

/**
 * A service's own photograph, when one has been dropped into
 * `public/services/<slug>.<ext>`. Checked on the server at render, so adding a
 * file is the whole job — no code change.
 */
function ownPhoto(service: Service): Photo | null {
  for (const ext of PHOTO_EXTENSIONS) {
    const file = path.join(process.cwd(), "public", "services", `${service.slug}.${ext}`);
    if (fs.existsSync(file)) {
      return { url: `/services/${service.slug}.${ext}`, alt: "" };
    }
  }
  return null;
}

/**
 * A photo uploaded in the dashboard wins; then a file dropped into
 * `public/services`. With neither, the card shows the logo mark — never a fleet
 * photo standing in for a service it does not show.
 */
function assignPhotos(uploaded: ServiceImage[]): (Photo | null)[] {
  return services.map((service) => {
    const chosen = uploaded.find((image) => image.slug === service.slug);
    if (chosen) return { url: chosen.url, alt: chosen.altText };

    return ownPhoto(service);
  });
}

/**
 * The services as picture cards — photo, name, one line, an arrow —
 * after the client's reference. Gold is only the arrow's ring and glyph, so
 * the section keeps no gold text and no second gold action.
 */
export async function ServicesShowcase({
  tone = "dark",
}: {
  tone?: "dark" | "deep";
}) {
  const photos = assignPhotos(await getServiceImagesSafely());

  return (
    <Section tone={tone}>
      <Reveal>
        <SectionHeading
          tone="dark"
          eyebrow="What we do"
          title="Every trip, one standard"
          intro="Professional chauffeur service designed around your schedule, your comfort and where you are going."
          data-reveal
        />
      </Reveal>

      <Reveal
        className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        y={30}
      >
        {services.map((service, index) => {
          const photo = photos[index];
          return (
            <Link
              key={service.slug}
              href={service.href}
              data-reveal
              className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-midnight">
                {photo ? (
                  <Image
                    src={photo.url}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <LogoMark className="absolute top-1/2 left-1/2 h-20 -translate-x-1/2 -translate-y-1/2 opacity-30" />
                )}
                {/* Fades the photo into the card so the edge reads as one piece. */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-midnight/70 to-transparent"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-[19px] leading-tight font-semibold text-white">
                  {service.name}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  {service.summary}
                </p>
                <div className="mt-5 flex flex-1 items-end justify-between gap-4">
                  <span className="font-sans text-[14px] font-semibold text-white underline-offset-4 group-hover:underline">
                    Learn more
                  </span>
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/70 text-gold transition-colors group-hover:bg-gold group-hover:text-midnight"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </Reveal>
    </Section>
  );
}
