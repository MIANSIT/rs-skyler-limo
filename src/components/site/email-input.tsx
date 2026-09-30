"use client";

import { useState } from "react";

import { Input, type Tone } from "@/components/ui/field";
import { clsx } from "@/lib/clsx";
import { suggestEmail } from "@/lib/email-suggest";

/**
 * An email box that catches the usual slips and reads the address back.
 *
 * On leaving the field it offers "Did you mean …?" for a domain one keystroke
 * off a common provider, and it always shows where the confirmation will go —
 * the customer's last chance to notice `gmial.com` before every email about
 * their trip, including the code to change it, goes nowhere.
 */
export function EmailInput({
  id,
  name = "email",
  tone = "light",
  defaultValue = "",
  maxLength,
  sendsWhat,
}: {
  id: string;
  name?: string;
  tone?: Tone;
  defaultValue?: string;
  maxLength?: number;
  /** "your confirmation", "our reply" — completes "We will send … to". */
  sendsWhat: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const dark = tone === "dark";
  const looksComplete = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  return (
    <>
      <Input
        id={id}
        name={name}
        type="email"
        tone={tone}
        autoComplete="email"
        required
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (suggestion) setSuggestion(null);
        }}
        onBlur={() => setSuggestion(suggestEmail(value))}
        aria-describedby={suggestion ? `${id}-suggestion` : undefined}
      />

      {suggestion ? (
        <p
          id={`${id}-suggestion`}
          role="status"
          className={clsx("text-[14px] leading-[1.6]", dark ? "text-white" : "text-midnight")}
        >
          Did you mean <span className="font-semibold break-all">{suggestion}</span>?{" "}
          <button
            type="button"
            onClick={() => {
              setValue(suggestion);
              setSuggestion(null);
            }}
            className="font-semibold underline underline-offset-4"
          >
            Use it
          </button>
        </p>
      ) : looksComplete ? (
        <p className={clsx("text-[13px] leading-[1.6]", dark ? "text-white/70" : "text-charcoal/80")}>
          We will send {sendsWhat} to <span className="font-semibold break-all">{value.trim()}</span>. Check it is
          right.
        </p>
      ) : null}
    </>
  );
}
