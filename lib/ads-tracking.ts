"use client";

// Fire from whatever CTA marks a real conversion for the ads campaigns
// (e.g. "Get the Coach App" button, signup success). No-ops safely if the
// user hasn't granted marketing consent, since gtag/fbq are only initialised
// with granted ad_storage/consent in that case - see app/layout.tsx and
// app/components/CookieConsent.tsx.
//
// GOOGLE_ADS_CONVERSION_LABEL is the "Sign-up-coach-app" conversion action
// from Google Ads > Goals > Conversions (manual/code setup, event snippet).
//
// META_CONVERSION_EVENT is still a placeholder - swap in a standard Meta
// Pixel event name (e.g. "Lead", "CompleteRegistration") from Meta Events
// Manager once that account exists.

const GOOGLE_ADS_CONVERSION_LABEL = "ShXnCJD_3u8cEImygeND";
const META_CONVERSION_EVENT = "PLACEHOLDER_EVENT_NAME";

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

export function trackCoachAppConversion() {
  if (typeof window === "undefined") return;

  const w = window as typeof window & { gtag?: Gtag; fbq?: Fbq };

  w.gtag?.("event", "conversion", {
    send_to: `AW-18192816393/${GOOGLE_ADS_CONVERSION_LABEL}`,
    value: 1.0,
    currency: "GBP",
  });

  w.fbq?.("track", META_CONVERSION_EVENT);
}

// "Progress Sign-up" conversion: fired by app/components/ProgressJoinForm.tsx
// once Progress has accepted the email and sent the sign-in link, so it counts
// the same moment as a progress_join_events row. Label from Google Ads >
// Goals > Conversions (manual/code setup, event snippet). Not a secret: it
// ships in the page either way, same as the Coach App's labels.
// Google only: the Meta pixel is still a placeholder (see above).
const GOOGLE_ADS_PROGRESS_LABEL = "0QwICMj5y5YdEImygeND";

export function trackProgressSignUpConversion() {
  if (typeof window === "undefined") return;

  const w = window as typeof window & { gtag?: Gtag };

  w.gtag?.("event", "conversion", {
    send_to: `AW-18192816393/${GOOGLE_ADS_PROGRESS_LABEL}`,
    value: 1.0,
    currency: "GBP",
  });
}
