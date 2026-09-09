import Link from "next/link";

export function Pagination({
  basePath,
  params,
  page,
  perPage,
  total,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  perPage: number;
  total: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (lastPage <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page") continue;
      const single = Array.isArray(value) ? value[0] : value;
      if (single) search.set(key, single);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const link =
    "rounded-sm border border-midnight/20 bg-white px-4 py-2 font-sans text-[14px] font-medium text-midnight transition-colors hover:border-midnight";

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4"
    >
      <p className="font-sans text-[14px] text-charcoal/60 tabular-nums">
        {first}–{last} of {total}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={link} rel="prev">
            Previous
          </Link>
        ) : null}

        {page < lastPage ? (
          <Link href={href(page + 1)} className={link} rel="next">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
