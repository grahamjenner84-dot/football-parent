import Link from "next/link";

// Promo for Progress, the parents' app (progress.footballparent.co.uk). It
// links to the /progress landing page rather than the app, so parents see
// what it does and start the trial from the join form there.
//
// Placements: "home" (the homepage's app slot, which it took over from the
// Coach App banner), "article" (the end of parent-facing articles; the Coach
// App banner keeps the middle, so the two never sit together) and
// "academy-pathway" (Progress sponsors the Academy Pathway section: the
// category page and the end of its articles carry the sponsor version, with
// the strapline).
//
// Measurement: links carry ?b=progress-<placement>, which PageViewPing.tsx
// logs into page_views.banner_variant like the Coach App banners. The Coach
// App A/B report skips progress-* values (getBannerVariantStats in
// lib/supabase/page-views.ts) so they never count as Coach App clicks.

export type ProgressPlacement = "article" | "home" | "academy-pathway";

function Arrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
    >
      <path
        d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProgressBanner({
  placement = "article",
  inArticle = placement === "article",
}: {
  placement?: ProgressPlacement;
  /** Adds the vertical spacing an in-body banner needs. */
  inArticle?: boolean;
}) {
  const sponsor = placement === "academy-pathway";
  return (
    <Link
      href={`/progress?b=progress-${placement}`}
      className={`group block rounded-2xl border border-[#d8ded1] bg-[#f4f6f1] px-6 py-6 no-underline transition hover:border-[#1a7a45] sm:px-8 ${
        inArticle ? "my-10" : ""
      }`}
    >
      {sponsor && (
        <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-[#5d6b60]">
          Academy Pathway is supported by
        </p>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- one small
              SVG logo, as on the /progress page. */}
          <img
            src="/progress/progress-lockup.svg"
            alt="Progress by Football Parent"
            width={574}
            height={146}
            className="mb-3 h-9 w-auto"
          />
          {sponsor ? (
            <>
              {/* The brand strapline. Only "progress" is ever green (brand
                  rules in the progress repo's brand/README.md). */}
              <p className="m-0 mb-2 text-lg font-bold leading-snug text-[#16211b] sm:text-xl">
                Trust the process. Track the <span className="text-[#1a7a45]">progress</span>.
              </p>
              <p className="m-0 text-base leading-7 text-[#3c4a40]">
                Whatever the pathway brings, keep a record of it: goals, assists and career stats,
                training and coach feedback, and season cards worth sharing.
              </p>
            </>
          ) : (
            <>
              <p className="m-0 mb-2 text-lg font-bold leading-snug text-[#16211b] sm:text-xl">
                Keep your child&apos;s whole football journey in one place
              </p>
              <p className="m-0 text-base leading-7 text-[#3c4a40]">
                Goals, assists and career stats, training and coach feedback, and season cards worth
                sharing.
              </p>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-[#1a7a45] px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-[#0f5d34] sm:self-auto">
          Start free trial
          <Arrow />
        </span>
      </div>
    </Link>
  );
}
