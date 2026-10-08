import Link from "next/link";

import { InstagramIcon, TikTokIcon } from "@/components/ui/icon";
import { LogoMark } from "@/components/brand/logo-mark";
import { CookiePreferencesLink } from "@/components/site/cookie-consent";
import { airportPages } from "@/lib/airport-pages";
import { boroughs, contact, services, social } from "@/lib/content";
import { getFleetSafely } from "@/lib/public/fleet";

/** Keyed by the name in `content.ts`, so adding a network there fails the
 *  typecheck here until its glyph exists rather than rendering a blank box. */
const socialIcons: Record<
  (typeof social)[number]["name"],
  (props: { className?: string }) => React.ReactElement
> = {
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
};

export async function SiteFooter() {
  // The same cached read the fleet page uses, so hiding a class removes it from
  // the footer too rather than leaving a link to a car we no longer run.
  const fleet = await getFleetSafely();

  return (
    <footer className="bg-midnight text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="md:col-span-1">
            <LogoMark className="h-14" />
            <p className="font-display mt-4 text-[17px] text-white/70 italic">
              Arrive in Style
            </p>
            <p className="mt-6 text-[15px] leading-[1.7] text-white/70">
              Chauffeured travel across all five boroughs.
            </p>

            {/*
              Follow links. Gold on hover only: on a midnight ground gold is
              safe for an icon, but the footer already competes with the page's
              one gold action, so at rest these stay the same weight as the
              links beside them.

              `rel="me"` states that the profile is the same entity as this
              site — the HTML counterpart of `sameAs` in the structured data.
              `noopener` because `target="_blank"` otherwise hands the opened
              tab a handle back to this one.
            */}
            {social.length > 0 ? (
              <ul className="mt-6 flex items-center gap-2">
                {social.map((profile) => {
                  const Icon = socialIcons[profile.name];
                  return (
                    <li key={profile.name}>
                      <a
                        href={profile.href}
                        target="_blank"
                        rel="me noopener noreferrer"
                        aria-label={`RSSkyler Limo on ${profile.name}`}
                        className="flex h-11 w-11 items-center justify-center rounded-sm border border-white/15 text-white/75 transition-colors hover:border-gold/60 hover:text-gold"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <FooterColumn title="Services">
            {services.map((service) => (
              <FooterLink key={service.name} href={service.href}>
                {service.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Airports">
            {airportPages.map((page) => (
              <FooterLink key={page.code} href={`/${page.slug}`}>
                {page.eyebrow}
              </FooterLink>
            ))}
            <FooterLink href="/airport-transportation">All airports</FooterLink>
          </FooterColumn>

          <FooterColumn title="Fleet">
            {fleet.length === 0 ? (
              <FooterLink href="/fleet">See the fleet</FooterLink>
            ) : (
              fleet.map((vehicle) => (
                <FooterLink key={vehicle.slug} href={`/fleet#${vehicle.slug}`}>
                  {vehicle.name}
                </FooterLink>
              ))
            )}
          </FooterColumn>

          <FooterColumn title="Contact">
            <FooterLink href={contact.phoneHref}>
              <span className="tabular-nums">{contact.phone}</span>
            </FooterLink>
            <FooterLink href={`mailto:${contact.email}`}>
              {/* An email address has no natural break opportunity, so it needs
                  explicit permission to wrap or it widens the whole page. */}
              <span className="[overflow-wrap:anywhere]">
                {contact.email}
              </span>
            </FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
            <FooterLink href="/service-areas">Service areas</FooterLink>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/reviews">Reviews</FooterLink>
            <FooterLink href="/corporate">Corporate accounts</FooterLink>
            <FooterLink href="/track">Track a ride</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-14 border-t border-white/15 pt-8">
          <p className="text-[13px] tracking-[0.08em] text-white/55 uppercase">
            {boroughs.join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-[13px] text-white/55">
              © <span className="tabular-nums">2026</span> RSSkyler Limo. New
              York City.
            </p>
            <Link
              href="/terms"
              className="inline-block py-1.5 text-[13px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/privacy"
              className="inline-block py-1.5 text-[13px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/accessibility"
              className="inline-block py-1.5 text-[13px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Accessibility
            </Link>
            <CookiePreferencesLink className="inline-block py-1.5 text-[13px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.12em] text-gold uppercase">
        {title}
      </h2>
      {/* The row gap moved onto the links themselves as padding. A 15px line of
          text is a 17px tap target, which is an unkind thing to aim a thumb at;
          padding makes each row ~33px without changing how the column looks. */}
      <ul className="mt-3 flex flex-col">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block py-2 text-[15px] text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}
