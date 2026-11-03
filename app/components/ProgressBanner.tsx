import type { ReactNode } from "react";
import ProgressBannerLink from "@/app/components/ProgressBannerLink";
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
// lib/supabase/page-views.ts) so they never count as Coach App clicks. The
// first time half the banner is on screen during a page view, the link's
// client island (ProgressBannerLink, or ProgressBannerTestArm in the test)
// logs one anonymous "banner seen" with that ?b= value
// (useProgressBannerSeen.ts -> progress_banner_seen), so CTR can be read on
// banners seen as well as on pages carrying one.
//
// A/B test: with `test` set (articles under /academy-pathway/* and
// /academy-trials/*, see lib/MDXContent.tsx), the banner renders arm A here
// on the server and ProgressBannerTestArm picks A or B in the browser on
// every page view, tagging the link progress-<placement>-a / -b. Both arms
// use the trial and development-centre copy; B adds the Player of the Match
// share card (the one in the Progress ads) and says "Try it free". Design,
// readout and the earlier copy test's result: lib/progress-banner-test.ts.

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

// The test's body copy (both arms): written for parents heading to a trial
// or a development centre. Nothing it says needs proving beyond what the app
// does.
const TRIAL_BODY =
  "Heading to a trial or development centre? Keep a record of every game, goal and piece of coach feedback, so you can see how far they've come, season after season.";

export default function ProgressBanner({
  placement = "article",
  inArticle = placement === "article",
  test = false,
  design = "classic",
}: {
  placement?: ProgressPlacement;
  /** Adds the vertical spacing an in-body banner needs. */
  inArticle?: boolean;
  /** Runs the trial/development-centre A/B test on this banner. */
  test?: boolean;
  /** "comic" on comic-accent articles (lib/comic-design.ts): ink outline,
   *  offset shadow and the card on the right, as on the homepage concepts
   *  canvas. Same words, links and measurement as the classic banner, and
   *  both test arms change together, so the A/B comparison is unaffected. */
  design?: "classic" | "comic";
}) {
  const comic = design === "comic";
  const sponsor = placement === "academy-pathway";
  // The homepage's comic banner is the canvas's full-width version: bigger
  // type and the share card at full size, beside the text on wide screens
  // and under the button on phones.
  const homeComic = comic && placement === "home";
  const className = homeComic
    ? "group block rounded-[20px] border-[3px] border-[#201E1D] bg-[#f4f6f1] p-6 no-underline shadow-[6px_6px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#201E1D] sm:p-10"
    : comic
    ? `group block rounded-[18px] border-[3px] border-[#201E1D] bg-[#f4f6f1] px-6 py-6 no-underline shadow-[6px_6px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#201E1D] sm:px-[26px] ${
        inArticle ? "my-10" : ""
      }`
    : `group block rounded-2xl border border-[#d8ded1] bg-[#f4f6f1] px-6 py-6 no-underline transition hover:border-[#1a7a45] sm:px-8 ${
        inArticle ? "my-10" : ""
      }`;
  const controlBody = sponsor
    ? "Whatever the pathway brings, keep a record of it: goals, assists and career stats, training and coach feedback, and season cards worth sharing."
    : "Track their goals and assists, log their progress and keep coach feedback in one place, season after season.";

  const head = (
    <>
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
    </>
  );

  // The Player of the Match share card from the Progress ads, rendered by
  // the app's own card code (progress repo, src/share/shareCard.ts): beside
  // the logo on phones, to the left of the text from sm up.
  const card = (className: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- one small static image
    <img
      src="/progress/progress-potm-card.webp"
      alt="A Progress share card: Alfie, Player of the Match, 1–0 vs Wanderers"
      width={480}
      height={600}
      loading="lazy"
      className={`h-auto rotate-3 rounded-lg shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)] ${className}`}
    />
  );

  // Comic layout: label, logo, strapline, body and button in one column,
  // the share card tilted on the right with a hard shadow.
  const comicCard = (className: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- one small static image
    <img
      src="/progress/progress-potm-card.webp"
      alt="A Progress share card: Alfie, Player of the Match, 1–0 vs Wanderers"
      width={480}
      height={600}
      loading="lazy"
      className={`h-auto shrink-0 rotate-[4deg] rounded-[10px] border-[3px] border-[#201E1D] shadow-[5px_5px_0_#201E1D] ${className}`}
    />
  );

  // Comic layout: label, logo, strapline, body and button in one column,
  // the share card tilted on the right with a hard shadow (beside the logo
  // on phones, as in the classic banner).
  const comicInner = (body: string, withCard = false, cta = "Start free trial"): ReactNode => (
    <div className="flex items-center gap-[26px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            {sponsor && (
              <p className="m-0 mb-2.5 text-[15px] font-semibold text-[#5d6b60]">
                Academy Pathway is supported by
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- one small SVG logo */}
            <img
              src="/progress/progress-lockup.svg"
              alt="Progress by Football Parent"
              width={574}
              height={146}
              className="h-[34px] w-auto self-start"
            />
          </div>
          {withCard && comicCard("w-[84px] sm:hidden")}
        </div>
        <p className="m-0 mt-2.5 text-[21px] font-bold leading-[1.25] text-[#16211b]">
          Trust the process. Track the <span className="text-[#1a7a45]">progress</span>.
        </p>
        <p className="m-0 mt-2 text-base leading-[1.6] text-[#3c4a40]">{body}</p>
        <span className="mt-4 inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full border-[3px] border-[#201E1D] bg-[#1a7a45] px-[18px] py-2.5 text-base font-bold text-white shadow-[3px_3px_0_#201E1D] transition-colors group-hover:bg-[#0f5d34]">
          {cta}
          <Arrow />
        </span>
      </div>
      {withCard && comicCard("hidden w-[130px] sm:block")}
    </div>
  );

  const homeInner = (body: string): ReactNode => (
    <div className="flex flex-wrap items-center gap-x-12 gap-y-8">
      <div className="flex min-w-0 flex-[999_1_440px] flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element -- one small SVG logo */}
        <img
          src="/progress/progress-lockup.svg"
          alt="Progress by Football Parent"
          width={574}
          height={146}
          className="h-10 w-auto self-start"
        />
        <p className="m-0 mt-[18px] text-[clamp(26px,2.8vw,34px)] font-bold leading-[1.15] text-[#16211b]">
          Trust the process. Track the <span className="text-[#1a7a45]">progress</span>.
        </p>
        <p className="m-0 mt-3.5 max-w-[560px] text-[19px] leading-[1.6] text-[#3c4a40]">{body}</p>
        <span className="mt-6 inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full border-[3px] border-[#201E1D] bg-[#1a7a45] px-[22px] py-3.5 text-lg font-bold text-white shadow-[4px_4px_0_#201E1D] transition-colors group-hover:bg-[#0f5d34]">
          Start free trial
          <Arrow />
        </span>
      </div>
      <div className="flex flex-[1_1_240px] justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- one small static image */}
        <img
          src="/progress/progress-potm-card.webp"
          alt="A Progress share card: Alfie, Player of the Match, 1–0 vs Wanderers"
          width={480}
          height={600}
          loading="lazy"
          className="h-auto w-[240px] rotate-[4deg] rounded-xl border-[3px] border-[#201E1D] shadow-[8px_8px_0_#201E1D]"
        />
      </div>
    </div>
  );

  const inner = (body: string, withCard = false, cta = "Start free trial"): ReactNode =>
    comic ? comicInner(body, withCard, cta) : classicInner(body, withCard, cta);

  const classicInner = (body: string, withCard = false, cta = "Start free trial"): ReactNode => (
    <>
      {sponsor && (
        <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-[#5d6b60]">
          Academy Pathway is supported by
        </p>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        {withCard && card("hidden w-[120px] shrink-0 sm:block")}
        <div className="flex-1">
          {withCard ? (
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">{head}</div>
              {card("w-[104px] shrink-0 sm:hidden")}
            </div>
          ) : (
            head
          )}
          <p className={`m-0 text-base leading-7 text-[#3c4a40] ${withCard ? "mt-3 sm:mt-0" : ""}`}>{body}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-[#1a7a45] px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-[#0f5d34] sm:self-auto">
          {cta}
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
        a={inner(TRIAL_BODY)}
        b={inner(TRIAL_BODY, true, "Try it free")}
      />
    );
  }

  return (
    <ProgressBannerLink banner={`progress-${placement}`} className={className}>
      {homeComic ? homeInner(controlBody) : inner(controlBody)}
    </ProgressBannerLink>
  );
}
