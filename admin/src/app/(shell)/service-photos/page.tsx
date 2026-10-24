import type { Metadata } from "next";

import { ServicePhotoManager } from "@/components/admin/service-photo-manager";
import { getServiceImages } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Service photos" };

export default async function ServicePhotosPage() {
  const services = await getServiceImages();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-midnight">
          Service photos
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] text-charcoal/70">
          The picture on each service card on the homepage: Airport Transfers, Weddings, Events and
          the rest. A service without an upload keeps the site&apos;s own picture.
        </p>
      </div>

      <ServicePhotoManager services={services} />
    </div>
  );
}
