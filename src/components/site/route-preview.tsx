"use client";

import { useRef } from "react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

import { gsap, useGSAP } from "@/lib/gsap";

gsap.registerPlugin(MotionPathPlugin);

const ROUTE =
  "M 24 172 C 78 172 96 140 128 128 C 168 113 190 132 226 118 C 268 102 276 66 322 58 C 356 52 372 44 404 40";

/**
 * "Answer 'where is my car' before the client opens the app to ask."
 *
 * The line draws, the car runs it once, and the ETA settles — a demonstration
 * of the tracking promise rather than a paragraph describing it. Geometry only,
 * no map tiles: this is an illustration of the product, and dressing it as a
 * real trip would be a small dishonesty the brand's discretion value rules out.
 */
export function RoutePreview() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions?.motion) return;

          const timeline = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: scope.current,
              start: "top 78%",
              once: true,
            },
          });

          timeline
            .from("[data-route-line]", {
              strokeDashoffset: 460,
              duration: 1.8,
              ease: "power2.out",
            })
            .from(
              "[data-route-stop]",
              { scale: 0, transformOrigin: "center", stagger: 0.35 },
              "-=1.5",
            )
            .to(
              "[data-route-car]",
              {
                motionPath: {
                  path: ROUTE,
                  // `path` takes raw path data, but `align` takes an element:
                  // handing it the same `d` string makes GSAP run it through
                  // querySelectorAll and throw on every tick.
                  align: "[data-route-line]",
                  alignOrigin: [0.5, 0.5],
                },
                duration: 3.2,
                ease: "power1.inOut",
              },
              "-=1.3",
            )
            .from(
              "[data-route-eta]",
              { autoAlpha: 0, y: 10, duration: 0.6, ease: "power3.out" },
              "-=1.6",
            );
        },
      );
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="relative overflow-hidden border border-white/15 bg-midnight p-6 md:p-8"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-sans text-[13px] font-medium tracking-[0.12em] text-gold uppercase">
            Live tracking
          </p>
          <p className="mt-3 font-display text-[22px] font-semibold text-white">
            Your driver is five minutes out.
          </p>
        </div>
        <div data-route-eta className="shrink-0 text-right">
          <p className="font-display text-[30px] leading-none font-semibold text-white tabular-nums">
            5<span className="text-[17px] text-white/60"> min</span>
          </p>
          <p className="mt-2 font-sans text-[13px] tracking-[0.08em] text-white/55 uppercase">
            ETA
          </p>
        </div>
      </div>

      <svg
        viewBox="0 0 428 200"
        className="mt-8 w-full"
        role="img"
        aria-label="Illustration of a car travelling a tracked route from pickup to destination"
      >
        <path
          d={ROUTE}
          fill="none"
          stroke="currentColor"
          className="text-white/12"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          data-route-line
          d={ROUTE}
          fill="none"
          stroke="currentColor"
          className="text-gold"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={460}
        />

        <g data-route-stop>
          <circle cx={24} cy={172} r={6} className="fill-white" />
        </g>
        <g data-route-stop>
          <circle cx={404} cy={40} r={6} className="fill-gold" />
          <circle
            cx={404}
            cy={40}
            r={12}
            className="fill-none stroke-gold/40"
            strokeWidth={1.5}
          />
        </g>

        {/* Parked partway along the route so the still frame reads correctly
            without JavaScript, and under reduced motion. GSAP takes over the
            transform when the timeline runs. */}
        <g data-route-car transform="translate(300 74)">
          <circle r={11} className="fill-white" />
          <circle r={4} className="fill-midnight" />
        </g>
      </svg>

      <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
        <RouteFact label="Pickup" value="6:00 a.m." />
        <RouteFact label="Vehicle" value="Luxury Sedan" />
        <RouteFact label="Flight" value="AA 100 · T4" />
      </dl>
    </div>
  );
}

function RouteFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[13px] tracking-[0.08em] text-white/50 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-[15px] font-medium text-white tabular-nums">
        {value}
      </dd>
    </div>
  );
}
