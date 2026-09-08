import { MaskedWords } from "@/components/motion/masked-words";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/section";

/**
 * The standing page header: midnight ground, gold eyebrow and rule, Fraunces
 * title. Quieter than the homepage hero by design — one set piece per site.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <section className="bg-midnight">
      <Container className="py-16 md:py-24">
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
      </Container>
    </section>
  );
}
