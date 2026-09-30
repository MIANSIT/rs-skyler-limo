"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteHeroMedia,
  reorderHeroMedia,
  replaceHeroMedia,
  setHeroMediaActive,
  uploadHeroMedia,
  type HeroFormState,
} from "@/lib/admin/hero-actions";
import type { HeroMediaItem } from "@/lib/api/types";

const control =
  "w-full rounded-sm border border-midnight/20 bg-white px-4 py-2.5 font-sans text-[15px] text-midnight placeholder:text-charcoal/40 focus:border-midnight focus:outline-none";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-midnight bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-midnight transition-colors hover:bg-grey disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function ReorderButton({
  ids,
  label,
  glyph,
}: {
  ids: string | null;
  label: string;
  glyph: string;
}) {
  if (!ids) {
    return (
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-midnight/10 text-charcoal/25"
      >
        {glyph}
      </span>
    );
  }

  return (
    <form action={reorderHeroMedia}>
      <input type="hidden" name="ids" value={ids} />
      <button
        type="submit"
        aria-label={label}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-midnight/25 text-midnight transition-colors hover:border-midnight hover:bg-grey"
      >
        {glyph}
      </button>
    </form>
  );
}

function SlideCard({
  item,
  upIds,
  downIds,
}: {
  item: HeroMediaItem;
  upIds: string | null;
  downIds: string | null;
}) {
  const [state, formAction] = useActionState<HeroFormState, FormData>(
    replaceHeroMedia,
    { status: "idle" },
  );

  return (
    <li className="flex flex-col overflow-hidden rounded-sm border border-midnight/10 bg-white">
      <div className="aspect-[16/10] w-full bg-grey">
        {item.kind === "video" ? (
          <video
            src={item.url}
            poster={item.posterUrl ?? undefined}
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          // Operator-facing thumbnail on a private host — a plain <img> avoids
          // an optimiser proxy hop for no benefit, same as the fleet manager.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.altText}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-midnight/20 bg-grey px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-charcoal uppercase">
            {item.kind}
          </span>
          {item.isActive ? (
            <span className="rounded-sm border border-green-700/40 bg-green-700/8 px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-green-800 uppercase">
              Active
            </span>
          ) : (
            <span className="rounded-sm border border-charcoal/30 bg-white px-2 py-0.5 font-sans text-[11px] font-medium tracking-[0.06em] text-charcoal uppercase">
              Hidden
            </span>
          )}
        </div>

        <p className="flex-1 font-sans text-[13px] leading-normal text-charcoal/80">
          {item.altText}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <form action={setHeroMediaActive}>
            <input type="hidden" name="id" value={item.id} />
            <input
              type="hidden"
              name="isActive"
              value={item.isActive ? "false" : "true"}
            />
            <button
              type="submit"
              className="rounded-sm border border-midnight/25 px-3 py-1.5 font-sans text-[12px] font-medium text-midnight transition-colors hover:border-midnight hover:bg-grey"
            >
              {item.isActive ? "Hide" : "Show"}
            </button>
          </form>

          <ReorderButton ids={upIds} label="Move up" glyph="↑" />
          <ReorderButton ids={downIds} label="Move down" glyph="↓" />

          <form action={deleteHeroMedia}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="rounded-sm border border-red-700/40 px-3 py-1.5 font-sans text-[12px] font-medium text-red-800 transition-colors hover:border-red-700 hover:bg-red-700/5"
            >
              Remove
            </button>
          </form>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-2 border-t border-midnight/10 pt-3"
        >
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="kind" value={item.kind} />
          <label className="font-sans text-[12px] font-medium tracking-[0.06em] text-charcoal/70 uppercase">
            Replace {item.kind}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="media"
              type="file"
              required
              accept={item.kind === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp"}
              className="min-w-0 flex-1 font-sans text-[13px] text-midnight file:mr-3 file:rounded-sm file:border-0 file:bg-midnight file:px-3 file:py-1.5 file:font-sans file:text-[12px] file:font-semibold file:text-white"
            />
            <SubmitButton>Replace</SubmitButton>
          </div>
          {state.status === "error" ? (
            <p role="alert" className="font-sans text-[12px] text-red-800">
              {state.message}
            </p>
          ) : null}
        </form>
      </div>
    </li>
  );
}

/**
 * The homepage hero's background slides. Deliberately the whole page rather
 * than a section of one, since there is no per-slide detail beyond what fits
 * on the card — unlike vehicles, a slide is just a file, a caption, and where
 * it sits in the rotation.
 */
export function HeroMediaManager({ media }: { media: HeroMediaItem[] }) {
  const [uploadState, uploadAction] = useActionState<HeroFormState, FormData>(
    uploadHeroMedia,
    { status: "idle" },
  );
  const [kind, setKind] = useState<"image" | "video">("image");

  const ids = media.map((item) => item.id);
  const swappedWith = (index: number, offset: number) => {
    const next = [...ids];
    const target = index + offset;
    if (target < 0 || target >= next.length) return null;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next.join(",");
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Slides
        </h2>
        <p className="mt-2 font-sans text-[14px] text-charcoal/70">
          The homepage hero cycles through active slides in this order. With
          none active it falls back to the plain midnight background. Slides
          fill the full width of the hero and crop to fit rather than
          stretch — a landscape 16:9 shot crops least.
        </p>

        {media.length === 0 ? (
          <p className="mt-5 rounded-sm border border-dashed border-midnight/20 px-5 py-8 text-center font-sans text-[15px] text-charcoal/60">
            No slides yet. Add an image or a short video below.
          </p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item, index) => (
              <SlideCard
                key={item.id}
                item={item}
                upIds={swappedWith(index, -1)}
                downIds={swappedWith(index, 1)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-midnight/10 bg-white p-6">
        <h2 className="font-sans text-[13px] font-semibold tracking-[0.08em] text-charcoal/60 uppercase">
          Add a slide
        </h2>

        <form action={uploadAction} className="mt-5 flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="kind"
                className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
              >
                Type
              </label>
              <select
                id="kind"
                name="kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as "image" | "video")}
                className={`${control} appearance-none pr-10`}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="media"
                className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
              >
                {kind === "video" ? "Video file" : "Image file"}
              </label>
              <input
                id="media"
                name="media"
                type="file"
                required
                accept={kind === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp"}
                className="w-full rounded-sm border border-midnight/20 bg-white px-4 py-2 font-sans text-[14px] text-midnight file:mr-4 file:rounded-sm file:border-0 file:bg-midnight file:px-3 file:py-1.5 file:font-sans file:text-[13px] file:font-semibold file:text-white"
              />
              <p className="font-sans text-[13px] text-charcoal/60">
                {kind === "video"
                  ? "MP4, up to 25 MB. Landscape, 16:9, at least 1920×1080."
                  : "JPEG, PNG or WebP, up to 5 MB. Landscape, 16:9, at least 1920×1080."}
              </p>
            </div>
          </div>

          {kind === "video" ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="poster"
                className="font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal/70 uppercase"
              >
                Poster image
              </label>
              <input
                id="poster"
                name="poster"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="w-full rounded-sm border border-midnight/20 bg-white px-4 py-2 font-sans text-[14px] text-midnight file:mr-4 file:rounded-sm file:border-0 file:bg-midnight file:px-3 file:py-1.5 file:font-sans file:text-[13px] file:font-semibold file:text-white"
              />
              <p className="font-sans text-[13px] text-charcoal/60">
                Optional. Shown while the video loads.
              </p>
            </div>
          ) : null}

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
              placeholder="A Luxury SUV crossing the Brooklyn Bridge at blue hour"
              className={control}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>Add slide</SubmitButton>

            {uploadState.status === "saved" ? (
              <p role="status" className="font-sans text-[14px] text-green-800">
                {uploadState.message}
              </p>
            ) : null}

            {uploadState.status === "error" ? (
              <p
                role="alert"
                className="border-l-2 border-red-700 bg-red-700/5 px-4 py-2.5 font-sans text-[14px] text-red-800"
              >
                {uploadState.message}
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
