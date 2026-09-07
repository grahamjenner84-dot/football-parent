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

const STORAGE_KEY = "fp-coach-app-handoff";

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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        landingPath: window.location.pathname,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        gclid: consent.marketing ? params.get("gclid") : null,
        firstSeenAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Private mode, or site data blocked. No attribution for this coach, and
    // no error either: this is measurement, and it must never get between
    // someone and signing up.
  }
}
