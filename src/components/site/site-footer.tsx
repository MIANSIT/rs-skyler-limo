import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { fleet, services } from "@/lib/content";

const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "The Bronx",
  "Staten Island",
];

export function SiteFooter() {
  return (
    <footer className="bg-midnight text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Wordmark tone="dark" size="md" />
            <p className="font-display mt-4 text-[17px] text-white/70 italic">
              Arrive in Style
            </p>
            <p className="mt-6 text-[15px] leading-[1.7] text-white/70">
              Chauffeured travel across all five boroughs, 24/7.
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
            {fleet.map((vehicle) => (
              <FooterLink key={vehicle.slug} href={`/fleet#${vehicle.slug}`}>
                {vehicle.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Contact">
            <FooterLink href="tel:+12125550147">
              <span className="tabular-nums">+1 (212) 555-0147</span>
            </FooterLink>
            <FooterLink href="mailto:reservations@rsskylerlimo.com">
              reservations@rsskylerlimo.com
            </FooterLink>
            <FooterLink href="/corporate">Corporate accounts</FooterLink>
            <FooterLink href="/track">Track a ride</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-14 border-t border-white/15 pt-8">
          <p className="text-[13px] tracking-[0.08em] text-white/55 uppercase">
            {boroughs.join(" · ")}
          </p>
          <p className="mt-4 text-[13px] text-white/55">
            © <span className="tabular-nums">2026</span> RSSkyler Limo. New York
            City.
          </p>
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
      <ul className="mt-5 flex flex-col gap-3">{children}</ul>
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
        className="text-[15px] text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}
