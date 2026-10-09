// The Progress banner A/B test on trial and development-centre articles.
//
// Scope: articles under /academy-pathway/* and /academy-trials/* only (not
// the category pages, the homepage or any other article). The parents
// reading those are the ones heading to a trial or a development centre,
// which is where Progress sign-ups have come from so far.
//
// Arms: A is the banner exactly as it rendered there before the test (the
// control). B keeps the logo, the strapline, the sponsor overline (on
// Academy Pathway articles) and the button, and changes only the body copy
// to speak to trial and development-centre parents.
//
// Assignment: 50/50 at random on every page view, in the browser, after the
// page mounts (app/components/ProgressBannerTestArm.tsx). Nothing is stored
// (no cookie, localStorage or sessionStorage), so no consent is needed. The
// article stays static and server-rendered with arm A; the banner sits
// mid-article, below the fold, so the swap to B is never seen.
//
// Not the Coach App test's design (bannerStyleForKey, one arm per article
// slug): there one page dominates the traffic, so whichever arm it lands on
// wins or loses on that page's audience. Randomising per view puts every
// page's readers into both arms equally.
//
// Clicks: each arm links with its own ?b= value, progress-<placement>-a or
// progress-<placement>-b, so its landings on /progress (page_views
// .banner_variant) and its join form sends (progress_join_events.banner)
// can be told apart. Both keep the progress-<placement> prefix, so the
// placement table, the channel rules (any ?b= is "Article banner") and the
// Coach App report (which skips progress-*) classify them exactly as before.
// A had to be tagged too: plain progress-article also comes from every other
// article, and progress-academy-pathway from the /academy-pathway page, so
// A's in-test clicks could not otherwise be separated. Before the island
// mounts (or with JavaScript off) the link carries the plain pre-test value,
// which counts for its placement but for neither arm.
//
// Impressions: there is no per-view record of the arm (that would need a
// page_views column, and a migration first), so each arm's impressions are
// estimated as half the eligible page views since the test started. Each
// view is an independent 50/50 draw, so half is an unbiased estimate; the
// readout marks it "≈".

/** When the test went live. MUST be set to the actual deploy time of the
 * merge that ships the test: anything earlier counts pre-test views of
 * these articles as impressions for both arms, which dilutes both CTRs. */
export const PROGRESS_BANNER_TEST_STARTED_AT = "2026-10-10T00:00:00Z";

/** Impressions each arm needs before the test can be called. */
export const PROGRESS_BANNER_TEST_MIN_IMPRESSIONS = 4000;
/** Posterior probability needed to call a winner (either way). */
export const PROGRESS_BANNER_TEST_THRESHOLD = 0.95;

export type ProgressBannerArm = "a" | "b";
export type ProgressBannerPlacement = "home" | "article" | "academy-pathway";

const TEST_SECTIONS = ["/academy-pathway/", "/academy-trials/"];

/** True for a path the test runs on (an article in one of the two
 * sections, not the section page itself). Whether the page actually
 * carries a Progress banner is progressBannerOnPath's job. */
export function inProgressBannerTest(path: string): boolean {
  return TEST_SECTIONS.some((s) => path.startsWith(s) && path.length > s.length);
}

/** The ?b= value of an arm's link. */
export function progressBannerArmValue(placement: ProgressBannerPlacement, arm: ProgressBannerArm): string {
  return `progress-${placement}-${arm}`;
}

const BANNER_VALUE = /^progress-(home|article|academy-pathway)(?:-(a|b))?$/;

/** Placement and test arm (null outside the test) of a ?b= value, or null
 * when it isn't a Progress banner. */
export function parseProgressBanner(
  value: string | null | undefined
): { placement: ProgressBannerPlacement; arm: ProgressBannerArm | null } | null {
  const m = value ? BANNER_VALUE.exec(value) : null;
  if (!m) return null;
  return { placement: m[1] as ProgressBannerPlacement, arm: (m[2] as ProgressBannerArm | undefined) ?? null };
}

// ---------------------------------------------------------------------------
// Readout maths (server-side, but pure)
// ---------------------------------------------------------------------------

// Lanczos approximation (g = 7, n = 9), accurate to ~15 digits for x > 0.
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const logBeta = (a: number, b: number) => logGamma(a) + logGamma(b) - logGamma(a + b);

/** P(rate_B > rate_A) with uniform priors, i.e. posteriors
 * Beta(1 + clicks, 1 + impressions - clicks), in closed form (Evan Miller,
 * "Formulas for Bayesian A/B testing"): exact, deterministic, and a sum of
 * 1 + clicksB terms, so cheap at banner-click volumes. Impressions may be
 * fractional (the half-of-views estimate). */
export function probabilityBBeatsA(
  a: { clicks: number; impressions: number },
  b: { clicks: number; impressions: number }
): number {
  const alphaA = 1 + a.clicks;
  const betaA = 1 + Math.max(0, a.impressions - a.clicks);
  const alphaB = 1 + Math.round(b.clicks); // must be a whole number for the sum
  const betaB = 1 + Math.max(0, b.impressions - b.clicks);
  const lbA = logBeta(alphaA, betaA);
  let total = 0;
  for (let i = 0; i < alphaB; i++) {
    total += Math.exp(logBeta(alphaA + i, betaA + betaB) - Math.log(betaB + i) - logBeta(1 + i, betaB) - lbA);
  }
  return Math.min(1, Math.max(0, total));
}

export type ProgressBannerTestStatus = "not-started" | "running" | "b-wins" | "a-wins" | "draw";

/** Keep running until both arms have the minimum impressions; then B or A
 * wins at 95% either way, and anything in between is a draw. */
export function progressBannerTestStatus(
  started: boolean,
  impressionsA: number,
  impressionsB: number,
  probBBeatsA: number
): ProgressBannerTestStatus {
  if (!started) return "not-started";
  if (Math.min(impressionsA, impressionsB) < PROGRESS_BANNER_TEST_MIN_IMPRESSIONS) return "running";
  if (probBBeatsA >= PROGRESS_BANNER_TEST_THRESHOLD) return "b-wins";
  if (probBBeatsA <= 1 - PROGRESS_BANNER_TEST_THRESHOLD) return "a-wins";
  return "draw";
}
