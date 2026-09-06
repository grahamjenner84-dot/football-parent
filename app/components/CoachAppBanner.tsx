import Link from "next/link";

// Promo banner for the Coach App, in two creatives and two audiences.
//
// Audience: parents care about their child's own record (goals, assists,
// man of the match); coaches/managers care about fair game time and the
// admin around it.
//
// Style: "dark" is the full-width black bar with the horizontal logo and a
// single line of copy; "light" is the quieter grey card with a paragraph and
// a button.
//
// Measurement: every banner links to DESTINATION with ?b=<style>-<audience>-
// <placement>, which PageViewPing.tsx logs into page_views.banner_variant.
// The Coach App tab in /admin/seo breaks clicks down by that value.
//
// While AB_TEST_ENABLED is true, articles are split between the two creatives
// by hashing the article slug, so both run at the same time and a click
// difference isn't confounded with whatever else changed that week. The hash
// is over the SLUG, not the article body, so editing an article doesn't
// silently flip it to the other creative mid-test. Set AB_TEST_ENABLED to
// false to end the test and serve ACTIVE_BANNER_STYLE everywhere.

export type CoachAppAudience = "parent" | "coach";
export type CoachAppBannerStyle = "dark" | "light";

export const AB_TEST_ENABLED = true;

// When the banners actually went live in production (commit 6c418af deployed
// 2026-09-04). The variant report clamps its window to this, because the
// impression side is counted from pageviews of the pages carrying each
// banner - and those pages have months of history from before any banner
// existed. Without the clamp a 30-day window reports thousands of
// impressions against a handful of clicks and the CTR is meaningless until
// the old traffic ages out. Also excludes the two localhost verification
// hits logged shortly before the deploy. Update this only if the test is
// restarted from scratch.
export const BANNER_TEST_STARTED_AT = "2026-09-04T20:30:00Z";
export const ACTIVE_BANNER_STYLE: CoachAppBannerStyle = "dark";

const DESTINATION = "/football-parent-coach-app";

// FNV-1a. Any stable, well-spread hash works here; the only requirements are
// that it's deterministic across builds (so a given article keeps its
// creative for the whole test) and doesn't correlate with anything about the
// article that might itself affect clicks.
function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function bannerStyleForKey(key: string | undefined): CoachAppBannerStyle {
  if (!AB_TEST_ENABLED || !key) return ACTIVE_BANNER_STYLE;
  return hashKey(key) % 2 === 0 ? "dark" : "light";
}

const DARK_COPY: Record<CoachAppAudience, string> = {
  parent:
    "Log every goal, assist and man of the match from the touchline.",
  coach:
    "Fair game time, lineups and match stats, without the Sunday-morning spreadsheet.",
};

const LIGHT_COPY: Record<
  CoachAppAudience,
  { title: string; body: string }
> = {
  parent: {
    title: "Keep a proper record of your child's season",
    body: "Appearances, goals, assists and minutes played, logged match by match instead of half-remembered at the end of the season.",
  },
  coach: {
    title: "Fair game time without doing the maths on the touchline",
    body: "Equal-time rotation, lineups, availability and match records in one place, so the Sunday-morning admin stops eating into the coaching.",
  },
};

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

export default function CoachAppBanner({
  audience = "parent",
  style = ACTIVE_BANNER_STYLE,
  placement = "article",
}: {
  audience?: CoachAppAudience;
  style?: CoachAppBannerStyle;
  placement?: "article" | "home";
}) {
  const spacing = placement === "article" ? "my-10" : "";
  const href = `${DESTINATION}?b=${style}-${audience}-${placement}`;

  if (style === "dark") {
    return (
      <Link
        href={href}
        // bg-black, not a near-black like slate-950: the white wordmark PNG
        // has a solid #000 box baked in behind the icon rather than a
        // transparent one, so any off-black background shows it as a visible
        // rectangle. For the same reason the hover state changes a ring
        // rather than the background, which would bring the box back.
        className={`group block rounded-2xl bg-black px-6 py-6 text-white transition hover:ring-1 hover:ring-white/25 sm:px-8 ${spacing}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
          {/* self-start is load-bearing: the mobile layout is flex-col, so the
              cross axis is horizontal and the default align-items:stretch
              pulls a width:auto image out to the full column width, squashing
              a 3.41:1 wordmark to 8.7:1. sm:items-center masks it from 640px
              up, so this only ever showed on phones. */}
          <img
            src="/logo-horizontal-coach-white.png"
            alt="Football Parent Coach App"
            className="h-8 w-auto flex-shrink-0 self-start sm:h-9 sm:self-auto"
          />

          <p className="flex-1 text-lg font-semibold leading-snug text-white sm:text-xl">
            {DARK_COPY[audience]}
          </p>

          <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
            See how it works
            <Arrow />
          </span>
        </div>
      </Link>
    );
  }

  const copy = LIGHT_COPY[audience];

  return (
    <aside
      className={`rounded-2xl border p-6 lg:p-8 ${spacing} ${
        placement === "article"
          ? "border-gray-200 bg-gray-50"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <img
          src="/logo-icon-coach.png"
          alt=""
          aria-hidden="true"
          className="h-12 w-12 flex-shrink-0"
        />

        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Football Parent Coach App
          </p>

          <h3 className="mb-3 text-xl font-bold text-gray-900">{copy.title}</h3>

          <p className="mb-5 text-base leading-7 text-gray-700">{copy.body}</p>

          <Link
            href={href}
            className="inline-block rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white! transition-colors hover:bg-blue-800"
          >
            See the Coach App
          </Link>
        </div>
      </div>
    </aside>
  );
}
