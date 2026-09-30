"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { payWithLink } from "@/lib/public/actions";

function PayButton({ amount }: { amount: string }) {
  const { pending } = useFormStatus();

  // The page's one gold action.
  return (
    <Button type="submit" variant="cta" size="lg" disabled={pending}>
      {pending ? "Opening Stripe…" : `Pay ${amount} securely`}
    </Button>
  );
}

/**
 * The button on a payment-link page. Reference and token travel as hidden
 * fields; the API checks the token again before opening Stripe, so these grant
 * nothing the link itself did not.
 */
export function PayLinkForm({
  reference,
  token,
  amount,
}: {
  reference: string;
  token: string;
  amount: string;
}) {
  const [error, action] = useActionState<string | null, FormData>(payWithLink, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="token" value={token} />
      <div>
        <PayButton amount={amount} />
      </div>
      {error ? (
        <p role="alert" className="text-[15px] text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}
