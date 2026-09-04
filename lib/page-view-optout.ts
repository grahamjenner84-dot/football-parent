// Per-browser opt-out from page view logging, for Graham's own visits.
//
// PageViewPing already skips /admin/*, on the reasoning that that's him
// checking the dashboard rather than a real visitor. The same reasoning
// applies to him browsing the public site: at this traffic volume one
// session of his own reading is a meaningful slice of the numbers, and it
// distorts the Coach App banner A/B badly, since a handful of self-generated
// clicks can swing a CTR that's measured over a few hundred impressions.
//
// Deliberately localStorage rather than a cookie: nothing here needs to
// reach the server, so a cookie would only add a header to every request
// and another thing to explain in the cookie policy. Same origin as the
// Coach App PWA (served via the /coach-app rewrite), so a single opt-out
// covers both if the app's own PageViewPing ever reads this key too.
//
// No expiry, on purpose. A flag that silently lapsed would quietly start
// counting his visits again with nothing to notice, which is worse than
// having to turn it off deliberately. Toggle it from the SEO admin page.

export const PAGE_VIEW_OPTOUT_KEY = "fp-page-view-optout";

export function isPageViewOptedOut(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(PAGE_VIEW_OPTOUT_KEY) === "1";
  } catch {
    // Private mode, or site data blocked. Fail open: log the view rather
    // than silently dropping real visitors' pageviews because a storage
    // read threw.
    return false;
  }
}

export function setPageViewOptOut(optedOut: boolean): void {
  if (typeof window === "undefined") return;

  try {
    if (optedOut) {
      window.localStorage.setItem(PAGE_VIEW_OPTOUT_KEY, "1");
    } else {
      window.localStorage.removeItem(PAGE_VIEW_OPTOUT_KEY);
    }
  } catch {
    // Nothing useful to do; the caller reads the value back to show state.
  }
}
