"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fp-cookie-consent";
const OPEN_EVENT = "fp:open-cookie-settings";
// ICO guidance recommends refreshing cookie consent roughly annually rather
// than treating it as a one-time, permanent choice. Keep in sync with the
// matching constant in the beforeInteractive script in app/layout.tsx.
const MAX_CONSENT_AGE_MS = 365 * 24 * 60 * 60 * 1000;

type Consent = {
  analytics: boolean;
  advertising: boolean;
  timestamp: string;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

function isStale(consent: Consent): boolean {
  const age = Date.now() - new Date(consent.timestamp).getTime();
  return !Number.isFinite(age) || age > MAX_CONSENT_AGE_MS;
}

type ConsentAction =
  | "banner_shown"
  | "accept_all"
  | "reject_all"
  | "save_preferences";

function logConsentEvent(action: ConsentAction, analytics: boolean, advertising: boolean) {
  // Fire-and-forget to our own backend - not gated on the choices themselves
  // (it's an anonymous aggregate count, not a tracking cookie). Use
  // keepalive so the request survives if the banner click also navigates
  // away or closes the tab.
  try {
    fetch("/api/cookie-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        analyticsGranted: analytics,
        advertisingGranted: advertising,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore - logging the choice should never block applying it
  }
}

function writeConsent(analytics: boolean, advertising: boolean, action: ConsentAction) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ analytics, advertising, timestamp: new Date().toISOString() })
    );
  } catch {
    // localStorage unavailable (e.g. blocked) - consent choice won't persist
    // across visits, but the in-session gtag/fbq updates below still apply.
  }

  const w = window as typeof window & {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  };

  w.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: advertising ? "granted" : "denied",
    ad_user_data: advertising ? "granted" : "denied",
    ad_personalization: advertising ? "granted" : "denied",
  });

  // Scaffolding for Meta Pixel, which isn't installed yet - a no-op today
  // (fbq is undefined), but ready to gate the pixel's own tracking the
  // moment it's added, per the "Cookies and advertising" section in
  // /privacy-policy (Google Ads, Meta, TikTok).
  w.fbq?.("consent", advertising ? "grant" : "revoke");

  logConsentEvent(action, analytics, advertising);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);
  const [advertisingChoice, setAdvertisingChoice] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing || isStale(existing)) {
      setVisible(true);
      logConsentEvent("banner_shown", false, false);
    }

    const openSettings = () => {
      const existing = readConsent();
      setAnalyticsChoice(existing?.analytics ?? false);
      setAdvertisingChoice(existing?.advertising ?? false);
      setManaging(true);
      setVisible(true);
    };

    window.addEventListener(OPEN_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_EVENT, openSettings);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent(true, true, "accept_all");
    setVisible(false);
    setManaging(false);
  };

  const rejectAll = () => {
    writeConsent(false, false, "reject_all");
    setVisible(false);
    setManaging(false);
  };

  const savePreferences = () => {
    writeConsent(analyticsChoice, advertisingChoice, "save_preferences");
    setVisible(false);
    setManaging(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-6">
        {!managing ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-slate-700">
              We use cookies to understand how visitors use Football Parent
              and, if you consent, for advertising. Analytics and
              advertising cookies are only set with your consent. See our{" "}
              <a
                href="/cookie-policy"
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Cookie Policy
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Privacy Policy
              </a>
              .
            </p>

            <div className="flex flex-shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const existing = readConsent();
                  setAnalyticsChoice(existing?.analytics ?? false);
                  setAdvertisingChoice(existing?.advertising ?? false);
                  setManaging(true);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Manage
              </button>

              <button
                type="button"
                onClick={rejectAll}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Accept all
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Cookie preferences
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Strictly necessary cookies are always on. Choose whether we
                can also set analytics or advertising cookies.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Strictly necessary
                </p>
                <p className="text-sm text-slate-600">
                  Required for the site to function. Always active.
                </p>
              </div>
              <span className="text-sm font-medium text-slate-400">
                Always on
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Analytics
                </p>
                <p className="text-sm text-slate-600">
                  Google Analytics (_ga, _ga_&lt;container-id&gt;, _gid) to
                  help us understand how the site is used. See the{" "}
                  <a
                    href="/cookie-policy"
                    className="font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={analyticsChoice}
                aria-label="Analytics cookies"
                onClick={() => setAnalyticsChoice((current) => !current)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                  analyticsChoice ? "bg-slate-900" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    analyticsChoice ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Advertising
                </p>
                <p className="text-sm text-slate-600">
                  Conversion tracking and retargeting cookies for advertising
                  platforms such as Google Ads and Meta (Facebook and
                  Instagram). See the{" "}
                  <a
                    href="/cookie-policy"
                    className="font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={advertisingChoice}
                aria-label="Advertising cookies"
                onClick={() => setAdvertisingChoice((current) => !current)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                  advertisingChoice ? "bg-slate-900" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    advertisingChoice ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setManaging(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={savePreferences}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
