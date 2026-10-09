import Link from "next/link";
import type { ReactNode } from "react";
import ProgressBannerTestArm from "@/app/components/ProgressBannerTestArm";

// Promo for Progress, the parents' app (progress.footballparent.co.uk). It
// links to the /progress landing page rather than the app, so parents see
// what it does and start the trial from the join form there.
//
// Placements: "home" (the homepage's app slot, which it took over from the
// Coach App banner), "article" (the mid-article slot of parent-facing
// articles, which it took over from the Coach App banner; see
// lib/MDXContent.tsx) and
// "academy-pathway" (Progress sponsors the Academy Pathway section: the
// category page and the end of its articles carry the sponsor version, with
// the strapline).
//
// Measurement: links carry ?b=progress-<placement>, which PageViewPing.tsx
// logs into page_views.banner_variant like the Coach App banners. The Coach
// App A/B report skips progress-* values (getBannerVariantStats in
// lib/supabase/page-views.ts) so they never count as Coach App clicks.
//
// A/B test: with `test` set (articles under /academy-pathway/* and
// /academy-trials/*, see lib/MDXContent.tsx), the banner renders arm A here
// on the server and ProgressBannerTestArm picks A or B in the browser on
// every page view, tagging the link progress-<placement>-a / -b. Only the
// body copy differs. Design and readout: lib/progress-banner-test.ts.

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

// Arm B's body: written for parents heading to a trial or a development
// centre. Nothing it says needs proving beyond what the app does.
const TRIAL_BODY =
  "Heading to a trial or development centre? Keep a record of every game, goal and piece of coach feedback, so you can see how far they've come, season after season.";

export default function ProgressBanner({
  placement = "article",
  inArticle = placement === "article",
  test = false,
}: {
  placement?: ProgressPlacement;
  /** Adds the vertical spacing an in-body banner needs. */
  inArticle?: boolean;
  /** Runs the trial/development-centre A/B test on this banner. */
  test?: boolean;
}) {
  const sponsor = placement === "academy-pathway";
  const className = `group block rounded-2xl border border-[#d8ded1] bg-[#f4f6f1] px-6 py-6 no-underline transition hover:border-[#1a7a45] sm:px-8 ${
    inArticle ? "my-10" : ""
  }`;
  const controlBody = sponsor
    ? "Whatever the pathway brings, keep a record of it: goals, assists and career stats, training and coach feedback, and season cards worth sharing."
    : "Track their goals and assists, log their progress and keep coach feedback in one place, season after season.";

  const inner = (body: string): ReactNode => (
    <>
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
          {/* The brand strapline. Only "progress" is ever green (brand rules
              in the progress repo's brand/README.md). */}
          <p className="m-0 mb-2 text-lg font-bold leading-snug text-[#16211b] sm:text-xl">
            Trust the process. Track the <span className="text-[#1a7a45]">progress</span>.
          </p>
          <p className="m-0 text-base leading-7 text-[#3c4a40]">{body}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-[#1a7a45] px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-[#0f5d34] sm:self-auto">
          Start free trial
          <Arrow />
        </span>
      </div>
    </>
  );

  if (test) {
    return (
      <ProgressBannerTestArm
        placement={placement}
        className={className}
        a={inner(controlBody)}
        b={inner(TRIAL_BODY)}
      />
    );
  }

  return (
    <Link href={`/progress?b=progress-${placement}`} className={className}>
      {inner(controlBody)}
    </Link>
  );
}
