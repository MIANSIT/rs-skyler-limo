import Link from "next/link";

import { clsx } from "@/lib/clsx";

/**
 * Filters are links and the search is a plain GET form, so the state lives in
 * the URL. An operator can bookmark "new bookings", send the link to a
 * colleague, and the back button behaves.
 */
export function FilterBar({
  basePath,
  statuses,
  activeStatus,
  query,
  placeholder,
}: {
  basePath: string;
  statuses: readonly string[];
  activeStatus?: string;
  query?: string;
  placeholder: string;
}) {
  const href = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const chip =
    "rounded-sm border px-3 py-1.5 font-sans text-[13px] font-medium tracking-[0.04em] capitalize transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={href()}
          className={clsx(
            chip,
            !activeStatus
              ? "border-midnight bg-midnight text-white"
              : "border-midnight/20 bg-white text-charcoal hover:border-midnight/50",
          )}
        >
          All
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={href(status)}
            className={clsx(
              chip,
              activeStatus === status
                ? "border-midnight bg-midnight text-white"
                : "border-midnight/20 bg-white text-charcoal hover:border-midnight/50",
            )}
          >
            {status}
          </Link>
        ))}
      </div>

      <form action={basePath} className="flex min-w-[16rem] flex-1 gap-2">
        {activeStatus ? (
          <input type="hidden" name="status" value={activeStatus} />
        ) : null}

        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query ?? ""}
          placeholder={placeholder}
          className="w-full rounded-sm border border-midnight/20 bg-white px-4 py-2 font-sans text-[14px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-sm border border-midnight bg-white px-4 py-2 font-sans text-[13px] font-semibold text-midnight transition-colors hover:bg-grey"
        >
          Search
        </button>
      </form>
    </div>
  );
}
