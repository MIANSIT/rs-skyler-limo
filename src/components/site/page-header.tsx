import Image from "next/image";

import { MaskedWords } from "@/components/motion/masked-words";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/section";
import { getServiceImagesSafely } from "@/lib/public/service-images";

type HeaderImage = { url: string; alt: string };

/**
 * The standing page header: midnight ground, gold eyebrow and rule, Fraunces
 * title. Quieter than the homepage hero by design — one set piece per site.
 * With an `image`, the photo sits beside the text on wide screens and below it
 * on narrow ones; without one the header is exactly as it always was.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  image?: HeaderImage | null;
}) {
  return (
    <section className="bg-midnight">
      <Container className="py-16 md:py-24">
        <div
          className={
            image ? "grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16" : ""
          }
        >
          <Reveal stagger={0.12}>
            <p
              data-reveal
              className="font-sans text-[13px] font-medium tracking-[0.16em] text-gold uppercase"
            >
              {eyebrow}
            </p>
            <h1
              data-reveal
              className="font-display mt-5 max-w-3xl text-[34px] leading-[1.1] font-semibold text-white md:text-[44px]"
            >
              <MaskedWords text={title} />
            </h1>
            <div data-reveal aria-hidden className="mt-7 h-px w-20 bg-gold" />
            <p
              data-reveal
              className="mt-7 max-w-2xl text-[17px] leading-[1.7] text-white/75"
            >
              {intro}
            </p>
          </Reveal>

          {image ? (
            <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-white/15">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * A page header that shows the photo an operator uploaded for a service in the
 * dashboard's Service photos page, if there is one. `service` is the service's
 * slug in `content.ts`. No upload, or the API unreachable: the plain header.
 */
export async function ServicePageHeader({
  service,
  ...header
}: {
  service: string;
  eyebrow: string;
  title: string;
  intro: string;
}) {
  const uploaded = (await getServiceImagesSafely()).find((image) => image.slug === service);

  return (
    <PageHeader
      {...header}
      image={uploaded ? { url: uploaded.url, alt: uploaded.altText } : null}
    />
  );
}
