"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { payWithLink } from "@/lib/public/actions";

function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  // The page's one gold action.
  return (
    <Button type="submit" variant="cta" size="lg" disabled={pending} className="w-full">
      {pending ? "Opening Stripe…" : label}
    </Button>
  );
}

/**
 * The button on a payment-link page. Reference and token travel as hidden
 * fields; the API checks the token again before opening Stripe, so these grant
 * nothing the link itself did not.
 */
export function PayLinkForm({ reference, token }: { reference: string; token: string }) {
  const [error, action] = useActionState<string | null, FormData>(payWithLink, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="token" value={token} />
      <PayButton label="PAY NOW" />
      {error ? (
        <p role="alert" className="text-[15px] text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The same button pinned to the bottom of a phone screen, shown only while the
 * one in the card is scrolled out of view — so it is always one tap away and
 * there is never a second gold button beside the first. It keeps its space when
 * hidden, so nothing jumps, and being `sticky` it stops before the footer.
 */
export function PayLinkBar({
  reference,
  token,
  amount,
  watchId,
}: {
  reference: string;
  token: string;
  amount: string;
  /** The element holding the card's own button. */
  watchId: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const element = document.getElementById(watchId);
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShow(!entry?.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      className={`sticky bottom-0 z-30 border-t border-white/15 bg-midnight px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden ${show ? "" : "invisible"}`}
    >
      {/* The amount rides along: the card that shows it is off screen here. */}
      <div className="flex items-center gap-4">
        <div>
          <p className="font-sans text-[12px] tracking-[0.08em] text-white/60 uppercase">Total</p>
          <p className="font-display text-[24px] leading-none font-semibold text-white tabular-nums">
            {amount}
          </p>
        </div>
        <div className="flex-1">
          <PayLinkForm reference={reference} token={token} />
        </div>
      </div>
    </div>
  );
}
