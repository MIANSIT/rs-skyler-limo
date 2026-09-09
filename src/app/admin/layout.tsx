import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard · RSSkylerLimo",
    template: "%s · RSSkylerLimo",
  },
  // An operator's dashboard has no business in a search index.
  robots: { index: false, follow: false },
};

/**
 * Metadata only. The signed-in chrome lives in `(shell)/layout.tsx` so that
 * `/admin/login` — which by definition has no session — does not render a nav
 * that would try to read one.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
