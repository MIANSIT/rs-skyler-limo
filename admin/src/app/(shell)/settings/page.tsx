import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/admin/dal";
import { formatPickup } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Settings" };

/**
 * Business settings. Today, one: the sales-tax rate new orders are charged.
 *
 * Each booking and quote request copies the rate when it comes in, so this
 * page never re-prices anything that already exists. An order's own rate is
 * changed on that order, beside its price.
 */
export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Settings
        </h1>
        <p className="mt-2 font-sans text-[15px] text-charcoal/70">
          How new orders are priced.
        </p>
      </div>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-display text-[22px] font-semibold text-midnight">Sales tax</h2>
        <ul className="mt-3 flex max-w-2xl list-disc flex-col gap-1.5 pl-5 font-sans text-[14px] leading-[1.7] text-charcoal/80">
          <li>
            Added on top of every price: fixed airport fares when the customer
            books, and the prices you set on quotes. You always type the price
            before tax.
          </li>
          <li>
            Each order keeps the rate it came in with, so changing this does not
            re-price existing orders.
          </li>
          <li>
            To charge one order differently, for example 0% for a tax-exempt
            client, change the rate on that order beside its price.
          </li>
        </ul>

        <div className="mt-6">
          <SettingsForm taxRate={settings.taxRate} />
        </div>

        <p className="mt-5 font-sans text-[13px] text-charcoal/60">
          {settings.taxRateUpdatedAt
            ? `Last changed ${formatPickup(settings.taxRateUpdatedAt)}.`
            : "Not changed yet. 8.875% is New York City's combined sales tax rate."}
        </p>
      </section>
    </div>
  );
}
