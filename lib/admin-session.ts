import crypto from "crypto";

// Shared shape of the admin session cookie set by app/api/admin-login/route.ts
// and validated by proxy.ts. Both of those keep their own copy of the HMAC:
// proxy.ts runs on the edge runtime and must use webcrypto, and the login
// route is auth code that isn't worth churning. This module exists for the
// third, non-auth consumer: app/api/page-view/route.ts, which only needs to
// answer "is this Graham's own browser?" and not to grant anything.
const SESSION_COOKIE = "fp_admin_session";
const AUTH_MESSAGE = "fp-admin-authed";

export { SESSION_COOKIE as ADMIN_SESSION_COOKIE };

/** Long-lived (1 year) marker set alongside the session cookie on admin
 * login, read only by the page-view endpoint. Exists so a device stays out of
 * page_views even after its 30-day admin session lapses. */
export const NO_TRACK_COOKIE = "fp_no_track";

/** True when the request carries a valid admin session cookie.
 *
 * Used to recognise the site owner's own devices. The cookie is httpOnly with
 * path "/", so every browser that has signed in to /admin sends it on every
 * request to the site, page-view pings included. That makes it a far better
 * "this is me" signal than the localStorage flag in lib/page-view-optout.ts,
 * which lives per-browser-profile, is invisible when it silently isn't set,
 * and has to be turned on again by hand on each new device.
 *
 * Plain string comparison rather than timingSafeEqual on purpose: the only
 * thing this decides is whether to record a page view. There is nothing to
 * extract by timing it, and forging it would let an attacker suppress their
 * own analytics row, which is not a threat worth code. */
export function hasAdminSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(AUTH_MESSAGE)
    .digest("hex");

  return cookieValue === expected;
}
