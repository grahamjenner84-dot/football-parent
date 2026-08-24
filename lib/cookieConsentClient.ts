// Shared client-side helpers for reading the visitor's cookie consent choice
// (stored by app/components/CookieConsent.tsx) from any other client
// component that needs to gate a script on it - e.g.
// app/components/AffiliateLinks.tsx. Keep this consent-only: it doesn't
// write anything, just reads and notifies.

export const CONSENT_STORAGE_KEY = "fp-cookie-consent";

// ICO guidance recommends refreshing cookie consent roughly annually rather
// than treating it as a one-time, permanent choice. Keep in sync with the
// matching constants in CookieConsent.tsx and the beforeInteractive script
// in app/layout.tsx.
export const MAX_CONSENT_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// Dispatched on window by CookieConsent.tsx whenever a visitor makes or
// changes a consent choice, so other components can react live in the same
// session instead of only picking up the choice on next page load.
export const CONSENT_CHANGED_EVENT = "fp:cookie-consent-changed";

export type Consent = {
  analytics: boolean;
  advertising: boolean;
  timestamp: string;
};

export type ConsentChangedDetail = {
  analytics: boolean;
  advertising: boolean;
};

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

export function isConsentStale(consent: Consent): boolean {
  const age = Date.now() - new Date(consent.timestamp).getTime();
  return !Number.isFinite(age) || age > MAX_CONSENT_AGE_MS;
}

export function hasFreshConsent(consent: Consent | null): consent is Consent {
  return consent !== null && !isConsentStale(consent);
}
