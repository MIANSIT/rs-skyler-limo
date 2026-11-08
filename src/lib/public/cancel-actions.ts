"use server";

import { headers } from "next/headers";

import { ApiRequestError, apiFetch } from "@/lib/api/client";

/**
 * Customers cancelling their own booking or quote request from /track.
 *
 * Stepped like `change-actions.ts`, and using the same emailed code: start →
 * code → confirm → done. `reference` and `phone` ride along as hidden fields on
 * every step; the token from a correct code lives in the state, and the API
 * re-checks all three on every call, so nothing here is trusted.
 */

export type CancelState =
  | { step: "start"; error?: string }
  | {
      step: "code";
      maskedEmail: string;
      expiresInMinutes: number;
      resendAfterSeconds: number;
      /** When the code was sent, for the resend countdown. */
      sentAt: number;
      error?: string;
      notice?: string;
    }
  | { step: "confirm"; token: string; error?: string }
  | { step: "done"; kind: "booking" | "quote"; wasPaid: boolean };

async function callerIp(): Promise<string | undefined> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function cancelStep(previous: CancelState, formData: FormData): Promise<CancelState> {
  const intent = String(formData.get("intent") ?? "");
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const forwardedFor = await callerIp();

  /* ---- Leave the flow ---- */
  if (intent === "back") return { step: "start" };

  /* ---- Email a code (first time, or again) ---- */
  if (intent === "send-code") {
    try {
      const sent = await apiFetch<{ maskedEmail: string; expiresInMinutes: number; resendAfterSeconds: number }>(
        "/api/change/code",
        { method: "POST", forwardedFor, body: { reference, phone, purpose: "cancel" } },
      );
      return {
        step: "code",
        ...sent,
        sentAt: Date.now(),
        notice: previous.step === "code" ? "We have sent a new code. Only the newest one works." : undefined,
      };
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      // A refused resend keeps the customer on the code screen.
      return previous.step === "code"
        ? { ...previous, error: error.failure.message, notice: undefined }
        : { step: "start", error: error.failure.message };
    }
  }

  /* ---- Check the code ---- */
  if (intent === "verify" && previous.step === "code") {
    const code = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (code.length !== 6) {
      return { ...previous, error: "Enter the 6-digit code from the email.", notice: undefined };
    }
    try {
      const verified = await apiFetch<{ token: string }>("/api/change/verify", {
        method: "POST",
        forwardedFor,
        body: { reference, phone, code, purpose: "cancel" },
      });
      return { step: "confirm", token: verified.token };
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      return { ...previous, error: error.failure.message, notice: undefined };
    }
  }

  /* ---- The final, deliberate click ---- */
  if (intent === "confirm" && previous.step === "confirm") {
    try {
      const result = await apiFetch<{ kind: "booking" | "quote"; wasPaid: boolean }>("/api/cancel", {
        method: "POST",
        forwardedFor,
        body: { reference, phone, token: previous.token },
      });
      return { step: "done", kind: result.kind, wasPaid: result.wasPaid };
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      // The session ran out or was spent: start again rather than show a
      // button that can no longer work.
      if (error.failure.status === 401) return { step: "start", error: error.failure.message };
      return { ...previous, error: error.failure.message };
    }
  }

  return { step: "start", error: "Something went out of step. Start again." };
}
