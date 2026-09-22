import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { CookiePreferencesLink } from "@/components/site/cookie-consent";
import { contact, services } from "@/lib/content";
import { getFleetSafely } from "@/lib/public/fleet";

const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "The Bronx",
  "Staten Island",
];

export async function SiteFooter() {
  // The same cached read the fleet page uses, so hiding a class removes it from
  // the footer too rather than leaving a link to a car we no longer run.
  const fleet = await getFleetSafely();

  return (
    <footer className="bg-midnight text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-1">
            <LogoMark className="h-14" />
            <div className="mt-5">
              <Wordmark tone="dark" size="md" />
            </div>
            <p className="font-display mt-4 text-[17px] text-white/70 italic">
              Arrive in Style
            </p>
            <p className="mt-6 text-[15px] leading-[1.7] text-white/70">
              Chauffeured travel across all five boroughs.
            </p>
          </div>

          <FooterColumn title="Services">
            {services.map((service) => (
              <FooterLink key={service.name} href={service.href}>
                {service.name}
              </FooterLink>
            ))}
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
      <h3 className="font-sans text-[13px] font-semibold tracking-[0.12em] text-gold uppercase">
        {title}
      </h3>
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
