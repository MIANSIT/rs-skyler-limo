import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-[28px] font-semibold text-midnight">
        Not found
      </h1>
      <p className="mt-3 font-sans text-[15px] text-charcoal/70">
        That request does not exist, or it has been removed.
      </p>

      <Link
        href="/bookings"
        className="mt-8 inline-block rounded-sm border border-midnight bg-white px-6 py-3 font-sans text-[15px] font-semibold text-midnight transition-colors hover:bg-grey"
      >
        Back to bookings
      </Link>
    </div>
  );
}
