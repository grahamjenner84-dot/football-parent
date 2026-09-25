// Hands the landing page's identity to the Coach App at sign-up time.
//
// The app and this site share one browser origin — the app is served at
// /coach-app/ via a Vercel rewrite, not a redirect or a subdomain — so
// localStorage written here is readable there. Same mechanism the
// cookie-consent choice already travels on.
//
// Keep STORAGE_KEY and the shape below in sync with
// src/data/landingHandoff.ts in the coach-app repo. There is no shared
// package between the two, so that pair of files is the contract.
//
// Why not document.referrer on the app side: by the time the app boots, the
// coach has been through accounts.google.com or an email client, so the
// referrer names one of those. The landing page that actually persuaded them
// is gone. This is the only thing that survives the round trip.

import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";

const STORAGE_KEY = "fp-coach-app-handoff";

// How the visit that ended in a sign-up began: the first page of the visit
// and where it came from. Separate from STORAGE_KEY because it is written
// at a different moment (on arrival, not at the moment of intent) and read
// by the app on its own when a coach signs up on the app's sign-in screen
// rather than through the form here. Keep in sync with FIRST_TOUCH_KEY in
// src/data/landingHandoff.ts in the coach-app repo.
const FIRST_TOUCH_KEY = "fp-first-touch";

// Matches MAX_AGE_MS on the app side: older than this is a different visit.
const FIRST_TOUCH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Same key and 12-month window as CookieConsent.tsx. Kept in sync with that
// file and the beforeInteractive script in app/layout.tsx.
const CONSENT_KEY = "fp-cookie-consent";
const MAX_CONSENT_AGE_MS = 365 * 24 * 60 * 60 * 1000;

type Consent = { analytics: boolean; marketing: boolean; timestamp: string };

function freshConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const consent = JSON.parse(raw) as Consent;
    const age = Date.now() - new Date(consent.timestamp).getTime();
    if (!Number.isFinite(age) || age > MAX_CONSENT_AGE_MS) return null;
    return consent;
  } catch {
    return null;
  }
}

export type FirstTouch = {
  /** First page of the visit, e.g. /coaching/equal-playing-time-in-grassroots-football. */
  entryPath: string;
  /** Hostname the visit arrived from, null for direct/unknown. */
  referrerHost: string | null;
  /** Search / Ads / AI / Social / Direct / Internal / Other, the same groups
   * the page-view reports use, so the two can be read side by side. */
  sourceGroup: SourceGroup;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  gclid: string | null;
  seenAt: string;
};

// Held in memory for the life of this page load. Next's client-side
// navigation keeps it, so a visitor who lands on an article and follows a
// banner to the Coach App page still has their entry page here, even when
// no consent has been given yet and nothing can be written to storage.
let visitTouch: FirstTouch | null = null;

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-social", "paidsocial"]);

function readStoredFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const touch = JSON.parse(raw) as FirstTouch;
    const age = Date.now() - new Date(touch.seenAt).getTime();
    if (!touch.entryPath || !Number.isFinite(age) || age < 0 || age > FIRST_TOUCH_MAX_AGE_MS) {
      return null;
    }
    return touch;
  } catch {
    return null;
  }
}

/**
 * Records how this visit began. Called on every page view (from
 * PageViewPing), but only the first call per page load does anything.
 *
 * document.referrer is read once, on the first call: Next's client-side
 * navigation never updates it, so it still names the external site the
 * visit came from even several pages in.
 *
 * Storage follows the same consent line as stashLandingHandoff below,
 * because this ends up on a named account: nothing is written without
 * analytics consent, and gclid only with marketing consent. Consent given
 * part-way through a visit is picked up on the next page view, which
 * persists the in-memory touch from the start of the visit.
 *
 * First touch wins: a fresh stored touch from an earlier visit this week is
 * kept rather than replaced, so a coach who found an article on Google on
 * Monday and came back via an ad on Wednesday is credited to Monday. The
 * Ads click is still visible in the landing page's own utm/gclid.
 */
export function captureFirstTouch(): void {
  if (typeof window === "undefined") return;

  if (!visitTouch) {
    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      referrerHost = null;
    }
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid");
    const utmMedium = params.get("utm_medium");
    const sourceGroup: SourceGroup =
      gclid || (utmMedium && PAID_MEDIUMS.has(utmMedium.toLowerCase()))
        ? "Ads"
        : classifyReferrerHost(referrerHost).group;

    visitTouch = {
      entryPath: window.location.pathname,
      referrerHost,
      sourceGroup,
      utmSource: params.get("utm_source"),
      utmMedium,
      utmCampaign: params.get("utm_campaign"),
      gclid,
      seenAt: new Date().toISOString(),
    };
  }

  const consent = freshConsent();
  if (!consent?.analytics) return;

  try {
    // An "Internal" touch means this page load started mid-visit (a
    // reload, or a link opened in a new tab), so the real entry is whatever
    // an earlier page load already stored. Only fall back to it when there
    // is nothing better.
    if (readStoredFirstTouch()) return;
    localStorage.setItem(
      FIRST_TOUCH_KEY,
      JSON.stringify({ ...visitTouch, gclid: consent.marketing ? visitTouch.gclid : null }),
    );
  } catch {
    // Storage blocked. Measurement only, never in the way.
  }
}

/** The earliest known start of this visit: an earlier stored touch if there
 * is one, otherwise this page load's. */
function currentFirstTouch(): FirstTouch | null {
  return readStoredFirstTouch() ?? visitTouch;
}

/**
 * Writes the stash, if consent allows.
 *
 * The split here is a judgement call, and a deliberately conservative one.
 * Unlike PageViewPing, which logs anonymously and therefore fires regardless
 * of consent, this ends up attached to a named account in the Coach App's
 * database — so it is personal data, and consent is the safer footing.
 *
 *  - Which page they landed on, and any utm_* campaign parameters, are
 *    gated on ANALYTICS consent. This is measuring how our own pages
 *    perform, which is what an analytics choice covers.
 *  - gclid is gated on MARKETING consent as well. It is a Google Ads click
 *    identifier whose purpose is ad attribution, so it belongs on the
 *    stricter side of the line.
 *
 * The practical cost is that attribution undercounts by roughly the share of
 * coaches who decline — the same blind spot the Ads conversions already
 * have. If that trade looks wrong, this function is the single place to
 * change it.
 */
export function stashLandingHandoff(): void {
  const consent = freshConsent();
  if (!consent?.analytics) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const first = currentFirstTouch();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        landingPath: window.location.pathname,
        // Campaign params from the landing URL, or failing that from the
        // start of the visit: an ad click that lands on an article and then
        // follows a link to the Coach App page has lost them from the URL
        // by the time the coach signs up.
        utmSource: params.get("utm_source") ?? first?.utmSource ?? null,
        utmMedium: params.get("utm_medium") ?? first?.utmMedium ?? null,
        utmCampaign: params.get("utm_campaign") ?? first?.utmCampaign ?? null,
        gclid: consent.marketing ? (params.get("gclid") ?? first?.gclid ?? null) : null,
        firstSeenAt: new Date().toISOString(),
        // Which Coach App banner sent them to this page, from the ?b= param
        // on the banner links (see app/components/CoachAppBanner.tsx).
        banner: params.get("b"),
        entryPath: first?.entryPath ?? null,
        entryReferrerHost: first?.referrerHost ?? null,
        entrySourceGroup: first?.sourceGroup ?? null,
        entrySeenAt: first?.seenAt ?? null,
      }),
    );
  } catch {
    // Private mode, or site data blocked. No attribution for this coach, and
    // no error either: this is measurement, and it must never get between
    // someone and signing up.
  }
}
