import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { OperatorMenu } from "@/components/admin/operator-menu";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * The signed-in shell: midnight header, white content, gold reserved for the
 * page's own primary action.
 *
 * It deliberately does not verify the session. A layout does not re-render on
 * navigation and does not control whether its children render, so a check here
 * would look like a gate without being one. Every page below calls the DAL,
 * which verifies on each request.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `flex-1` rather than `min-h-screen`: the body is already a full-height
    // flex column, so a second viewport-height claim would overflow it.
    <div className="flex flex-1 flex-col bg-grey">
      <header className="bg-midnight">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 sm:gap-x-8 sm:px-6 sm:pt-5">
          <Wordmark tone="dark" size="sm" />
          {/* The eyebrow is the first thing worth losing on a narrow phone —
              the wordmark already says whose dashboard this is. */}
          <span className="hidden font-sans text-[12px] tracking-[0.16em] text-white/40 uppercase sm:inline">
            Reservations
          </span>
          <div className="ml-auto">
            {/* Reading the session is request-time work. Streaming it keeps the
                chrome from waiting on the API round trip. */}
            <Suspense fallback={<div className="h-9" />}>
              <OperatorMenu />
            </Suspense>
          </div>
        </div>

        {/* `min-w-0` so the scrolling tab strip inside can actually shrink —
            without it a flex/grid child refuses to go below its content width
            and the strip pushes the page sideways instead of scrolling. */}
        <div className="mx-auto min-w-0 max-w-6xl px-2 sm:px-4">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
