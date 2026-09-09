import { formatRelative } from "@/lib/admin/format";
import type { ActivityEntry } from "@/lib/api/types";

const actionLabels: Record<string, string> = {
  status_changed: "Status changed",
  updated: "Note added",
};

export function ActivityTrail({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="rounded-sm border border-midnight/10 bg-white">
      <h2 className="border-b border-midnight/10 px-6 py-4 font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        History
      </h2>

      {entries.length === 0 ? (
        <p className="px-6 py-6 font-sans text-[15px] text-charcoal/60">
          Nothing recorded yet.
        </p>
      ) : (
        <ol className="divide-y divide-midnight/8">
          {entries.map((entry) => (
            <li key={entry.id} className="px-6 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-sans text-[14px] font-medium text-midnight">
                  {actionLabels[entry.action] ?? entry.action}
                  {entry.toStatus ? (
                    <span className="font-normal text-charcoal/70">
                      {" "}
                      {entry.fromStatus} → {entry.toStatus}
                    </span>
                  ) : null}
                </span>
                <span className="font-sans text-[13px] text-charcoal/50">
                  {entry.actor ?? "System"} · {formatRelative(entry.createdAt)}
                </span>
              </div>

              {entry.note ? (
                <p className="mt-1.5 font-sans text-[14px] break-words text-charcoal/80">
                  {entry.note}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
