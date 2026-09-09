import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-midnight px-6 py-16">
      <div className="w-full max-w-sm">
        <Logo tone="dark" priority className="mb-10" />

        <h1 className="font-display text-[30px] leading-tight font-semibold text-white">
          Reservations
        </h1>
        <p className="mt-2 font-sans text-[15px] text-white/60">
          Sign in to manage bookings and quote requests.
        </p>

        {expired ? (
          <p
            role="status"
            className="mt-6 border-l-2 border-gold bg-white/5 px-4 py-3 font-sans text-[14px] text-white/80"
          >
            Your session ended. Sign in again to continue.
          </p>
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
