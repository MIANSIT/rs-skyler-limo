"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  removeServiceImage,
  uploadServiceImage,
  type ServiceImageState,
} from "@/lib/admin/service-image-actions";
import type { ServiceImageSlot } from "@/lib/api/types";

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none";

function Save({ replacing }: { replacing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Uploading…" : replacing ? "Replace photo" : "Upload photo"}
    </button>
  );
}

function ServiceCard({ service }: { service: ServiceImageSlot }) {
  const [state, action] = useActionState<ServiceImageState, FormData>(uploadServiceImage, {
    status: "idle",
  });

  return (
    <article className="flex flex-col overflow-hidden rounded-sm border border-midnight/10 bg-white">
      <div className="relative flex aspect-4/3 items-center justify-center bg-grey">
        {service.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- a dashboard preview of an external upload
          <img
            src={service.image.url}
            alt={service.image.altText}
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="px-6 text-center font-sans text-[14px] text-charcoal/60">
            No photo uploaded. The site shows its own picture for this service.
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <h2 className="font-display text-[20px] font-semibold text-midnight">{service.name}</h2>

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={service.slug} />
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium text-charcoal/70">
              Photo (JPEG, PNG or WebP, up to 5 MB)
            </span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required
              className="font-sans text-[14px] text-midnight"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium text-charcoal/70">
              Image alt text (for Google SEO)
            </span>
            <span className="font-sans text-[12px] text-charcoal/55">
              A short description of the photo with your keywords, e.g. &quot;Luxury chauffeur
              airport transfer in New York&quot;. Google reads it; it also helps screen readers.
            </span>
            <input
              name="altText"
              required
              maxLength={255}
              defaultValue={service.image?.altText ?? ""}
              placeholder="e.g. Luxury chauffeur airport transfer in New York"
              className={control}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Save replacing={Boolean(service.image)} />
            {state.status === "saved" ? (
              <p role="status" className="font-sans text-[13px] text-green-800">
                {state.message}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p role="alert" className="font-sans text-[13px] text-red-800">
                {state.message}
              </p>
            ) : null}
          </div>
        </form>

        {service.image ? (
          <form action={removeServiceImage}>
            <input type="hidden" name="slug" value={service.slug} />
            <button
              type="submit"
              className="font-sans text-[13px] text-red-800 underline underline-offset-4"
            >
              Remove photo
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export function ServicePhotoManager({ services }: { services: ServiceImageSlot[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.slug} service={service} />
      ))}
    </div>
  );
}
