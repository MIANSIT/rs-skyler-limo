"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteVehiclePhoto,
  setPrimaryPhoto,
  uploadVehiclePhoto,
  type FleetFormState,
} from "@/lib/admin/fleet-actions";
import type { Vehicle } from "@/lib/api/types";

function UploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Uploading…" : "Add photo"}
    </button>
  );
}

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none";

/**
 * Photography lives on its own, saved independently of the vehicle's text.
 *
 * Deliberately not part of the main form: an upload is a file transfer that can
 * fail on a hotel wifi, and losing a page of carefully written copy because a
 * 4 MB JPEG timed out would be indefensible.
 */
export function PhotoManager({ vehicle }: { vehicle: Vehicle }) {
  const [state, formAction] = useActionState<FleetFormState, FormData>(
    uploadVehiclePhoto,
    { status: "idle" },
  );

  return (
    <section className="rounded-sm border border-midnight/10 bg-white p-6">
      <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
        Photography
      </h2>
      <p className="mt-2 font-sans text-[14px] text-charcoal/70">
        RSSkyler&rsquo;s own vehicles on real New York streets. The primary
        exterior shot is the one the fleet card shows.
      </p>

      {vehicle.photos.length === 0 ? (
        <p className="mt-5 rounded-sm border border-dashed border-midnight/20 px-5 py-8 text-center font-sans text-[15px] text-charcoal/60">
          No photos yet. The public card shows the RS mark on midnight until one
          is added — never a stock photo of an unrelated car.
        </p>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicle.photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-col overflow-hidden rounded-sm border border-midnight/10"
            >
              {/* A plain <img>: these are operator-facing thumbnails on a
                  private host, so Next's optimiser would add a proxy hop for
                  no benefit. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.altText}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                className="aspect-[16/10] w-full bg-grey object-cover"
              />

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-midnight/20 bg-grey px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-charcoal uppercase">
                    {photo.kind}
                  </span>
                  {photo.isPrimary ? (
                    <span className="rounded-sm border border-gold bg-gold/10 px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-midnight uppercase">
                      Primary
                    </span>
                  ) : null}
                  {photo.width && photo.height ? (
                    <span className="font-sans text-[12px] text-charcoal/50 tabular-nums">
                      {photo.width}×{photo.height}
                    </span>
                  ) : null}
                </div>

                <p className="flex-1 font-sans text-[13px] leading-normal text-charcoal/80">
                  {photo.altText}
                </p>

                <div className="flex flex-wrap gap-2">
                  {photo.isPrimary ? null : (
                    <form action={setPrimaryPhoto}>
                      <input type="hidden" name="id" value={vehicle.id} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button
                        type="submit"
                        className="rounded-sm border border-midnight/25 px-3 py-1.5 font-sans text-[12px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
                      >
                        Make primary
                      </button>
                    </form>
                  )}

                  <form action={deleteVehiclePhoto}>
                    <input type="hidden" name="id" value={vehicle.id} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button
                      type="submit"
                      className="rounded-sm border border-red-700/40 px-3 py-1.5 font-sans text-[12px] font-medium text-red-800 transition-colors hover:border-red-700 hover:bg-red-700/5"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="mt-8 flex flex-col gap-5 border-t border-midnight/10 pt-6"
      >
        <input type="hidden" name="id" value={vehicle.id} />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="photo"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              Image file
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="w-full rounded-sm border border-midnight/20 bg-white px-4 py-2 font-sans text-[14px] text-midnight file:mr-4 file:rounded-sm file:border-0 file:bg-midnight file:px-3 file:py-1.5 file:font-sans file:text-[13px] file:font-semibold file:text-white"
            />
            <p className="font-sans text-[13px] text-charcoal/60">
              JPEG, PNG or WebP, up to 5 MB. Landscape reads best on the card.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="kind"
              className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
            >
              Shot
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue="exterior"
              className={`${control} appearance-none pr-10`}
            >
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="altText"
            className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
          >
            Alt text
          </label>
          <input
            id="altText"
            name="altText"
            required
            maxLength={255}
            placeholder="Black Luxury SUV outside a Brooklyn brownstone at blue hour"
            className={control}
          />
          <p className="font-sans text-[13px] text-charcoal/60">
            Describe what is in the photo. Read aloud by screen readers and
            shown if the image fails to load.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="isPrimary"
            type="checkbox"
            name="isPrimary"
            className="mt-1 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border border-midnight/30 accent-midnight"
          />
          <label
            htmlFor="isPrimary"
            className="cursor-pointer font-sans text-[15px] text-midnight"
          >
            Use as the primary photo
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <UploadButton />

          {state.status === "saved" ? (
            <p role="status" className="font-sans text-[14px] text-green-800">
              {state.message}
            </p>
          ) : null}

          {state.status === "error" ? (
            <p
              role="alert"
              className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2.5 font-sans text-[14px] text-red-800"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
