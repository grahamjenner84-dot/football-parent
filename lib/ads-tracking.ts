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

// "Progress Trial" conversion: fired by app/components/ProgressJoinForm.tsx
// once Progress has accepted the email and sent the sign-in link, so it counts
// the same moment as a progress_join_events row. Label from Google Ads >
// Goals > Conversions (manual/code setup, event snippet). Not a secret: it
// ships in the page either way, same as the Coach App's labels. Its goal
// category is Subscribe and not an account default, so Coach App campaigns,
// which bid on the Sign-up goal, never count a Progress trial.
// Google only: the Meta pixel is still a placeholder (see above).
const GOOGLE_ADS_PROGRESS_LABEL = "HolACIWlz5YdEImygeND";

// At most once per page load, with a transaction_id Google Ads dedupes on:
// a parent who sends the link, then sends it again (the resend button, the
// other form on the page, a different email) is still one trial. The id is
// random per page load and carries nothing about the parent: never the
// email, nor a hash of it.
let progressConversionSent = false;

function randomTransactionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function trackProgressSignUpConversion() {
  if (typeof window === "undefined" || progressConversionSent) return;
  progressConversionSent = true;

  const w = window as typeof window & { gtag?: Gtag };

  w.gtag?.("event", "conversion", {
    send_to: `AW-18192816393/${GOOGLE_ADS_PROGRESS_LABEL}`,
    value: 1.0,
    currency: "GBP",
    transaction_id: randomTransactionId(),
  });
}
