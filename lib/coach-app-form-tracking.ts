import { isPageViewOptedOut } from "@/lib/page-view-optout";

// The Coach App sign-up form's own steps (app/components/CoachSignUpForm.tsx),
// so a drop between "saw the form" and "signed up" can be placed: never
// tapped, tapped Google and didn't come back, or asked for the email and
// never used it. Before this the only numbers either side of the form were
// the page view and the sign-up itself.
//
// Same mechanism and the same anonymity as the game time calculator's steps
// (calculatorTracking.ts in the coach-app repo): a synthetic path posted to
// /api/page-view, path, referrer host and campaign params only, no consent
// needed for the same reason page views need none. The prefix is in
// lib/supabase/page-views.ts's step prefixes, so these are kept out of page
// view totals and reported with the calculator's steps on the Coach App tab.
//
//   /coach-app/signup-form/<page>/view         the form was on screen
//   /coach-app/signup-form/<page>/google       "Sign up with Google" tapped
//   /coach-app/signup-form/<page>/google-error Google sign-in didn't open
//   /coach-app/signup-form/<page>/email-open   "No Google?" tapped
//   /coach-app/signup-form/<page>/email        "Email me a link" submitted
//   /coach-app/signup-form/<page>/email-sent   the email went
//   /coach-app/signup-form/<page>/email-error  the email failed to send
//
// <page> is the landing page's own path, e.g. football-parent-coach-app or
// football-parent-coach-app/equal-playing-time-calculator, so each variant
// reads on its own. Each step counts once per page load, whichever of the
// page's two forms it came from.

export const SIGNUP_FORM_STEP_PREFIX = "/coach-app/signup-form";

export type SignupFormStep = "view" | "google" | "google-error" | "email-open" | "email" | "email-sent" | "email-error";

const sentThisLoad = new Set<string>();

export function signupFormStepPath(pagePath: string, step: SignupFormStep): string {
  const page = pagePath.replace(/\/+$/, "") || "/home";
  return `${SIGNUP_FORM_STEP_PREFIX}${page}/${step}`;
}

/** Fire-and-forget. Never throws, never blocks the form: this is measurement. */
export function trackSignupFormStep(step: SignupFormStep): void {
  if (typeof window === "undefined") return;
  const path = signupFormStepPath(window.location.pathname, step);
  if (sentThisLoad.has(path)) return;
  sentThisLoad.add(path);
  if (isPageViewOptedOut()) return;

  let referrerHost: string | null = null;
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    referrerHost = null;
  }
  const params = new URLSearchParams(window.location.search);
  try {
    void fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        referrerHost,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        gclid: params.get("gclid"),
        fbclid: params.get("fbclid"),
        bannerVariant: params.get("b"),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // No fetch: nothing to report.
  }
}
