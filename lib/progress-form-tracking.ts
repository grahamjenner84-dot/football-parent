import { isPageViewOptedOut } from "@/lib/page-view-optout";

// The Progress join forms' own steps, so a drop between "saw the form" and
// "signed up" can be placed: never tapped, tapped Google and didn't come
// back, opened the email form ("No Google?") and left, or asked for the
// email and never used it. Same mechanism as the Coach App form's steps
// (lib/coach-app-form-tracking.ts): an anonymous synthetic path posted to
// /api/page-view, kept out of page views (lib/supabase/page-views.ts) and
// counted on the Progress pipeline tab (joinFormSteps in
// lib/supabase/progress-funnel.ts).
//
//   /progress/join-form/site/<form>/<step>   the join forms on /progress
//                                            (<form> is join or join-trial)
//   /progress/join-form/app/sign-in/<step>   the Progress app's sign-in
//                                            screen, posted from the app
//                                            (src/lib/joinFormTracking.ts
//                                            in the progress repo)
//
// Steps: view, google, email-open, email, email-sent, email-error (and
// google-error from the app). Each counts once per page load.

export const PROGRESS_FORM_STEP_PREFIX = "/progress/join-form";

export type ProgressFormStep = "view" | "google" | "email-open" | "email" | "email-sent" | "email-error";

const sentThisLoad = new Set<string>();

/** Fire-and-forget. Never throws, never blocks the form: this is measurement. */
export function trackProgressFormStep(form: string, step: ProgressFormStep): void {
  if (typeof window === "undefined") return;
  const path = `${PROGRESS_FORM_STEP_PREFIX}/site/${form}/${step}`;
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
