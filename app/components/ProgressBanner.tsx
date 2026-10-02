import Link from "next/link";

// Promo for Progress, the parents' app (progress.footballparent.co.uk), on
// the homepage and at the end of parent-facing articles. It links to the
// /progress landing page rather than the app, so parents see what it does
// and start the trial from the join form there.
//
// Measurement: links carry ?b=progress-<placement>, which PageViewPing.tsx
// logs into page_views.banner_variant like the Coach App banners. The Coach
// App A/B report skips progress-* values (getBannerVariantStats in
// lib/supabase/page-views.ts) so they never count as Coach App clicks.

export type ProgressPlacement = "article" | "home";

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

export default function ProgressBanner({ placement = "article" }: { placement?: ProgressPlacement }) {
  return (
    <Link
      href={`/progress?b=progress-${placement}`}
      className={`group block rounded-2xl border border-[#d8ded1] bg-[#f4f6f1] px-6 py-6 no-underline transition hover:border-[#1a7a45] sm:px-8 ${
        placement === "article" ? "my-10" : ""
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- one small
              SVG logo, as on the /progress page. self-start keeps the
              flex-col (mobile) layout from stretching it. */}
          <img
            src="/progress/progress-lockup.svg"
            alt="Progress by Football Parent"
            width={574}
            height={146}
            className="mb-3 h-9 w-auto self-start"
          />
          <p className="m-0 mb-2 text-lg font-bold leading-snug text-[#16211b] sm:text-xl">
            Keep your child&apos;s whole football journey in one place
          </p>
          <p className="m-0 text-base leading-7 text-[#3c4a40]">
            Goals, assists and career stats, training and coach feedback, and season cards worth
            sharing. 4 weeks free, then £2.50 a month.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-[#1a7a45] px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-[#0f5d34] sm:self-auto">
          Start free trial
          <Arrow />
        </span>
      </div>
    </Link>
  );
}
