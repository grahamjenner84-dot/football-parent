import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client for the COACH APP's project, not this site's.
//
// This site's own lib/supabase/* modules all talk to the footballparent
// project with a service-role key, server-side only. This one is different in
// both respects: it runs in the browser, and it points at the separate
// coach-app Supabase project, because the account being created belongs to
// the app, not to the blog.
//
// Why a session created here works over there: /coach-app is a Vercel
// *rewrite* to a separate deployment (see this repo's vercel.json), not a
// redirect or a subdomain - so the browser only ever sees
// www.footballparent.co.uk and both sides share one origin, and therefore one
// localStorage. supabase-js persists the session under
// `sb-<project-ref>-auth-token`, a key derived purely from the Supabase URL,
// so signing in here writes the session into the exact slot the app reads on
// boot (its App.tsx gates on nothing more than that session). The hand-off is
// a plain redirect - no token in the URL, no bridge.
//
// The anon key is public by design: it already ships inside the app's own
// JS bundle. It is not a secret and grants nothing beyond what the app's RLS
// policies allow.

const url = process.env.NEXT_PUBLIC_COACH_APP_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_COACH_APP_SUPABASE_ANON_KEY;

/** Where Supabase sends the browser once the coach has authenticated.
 *
 * Deliberately a hardcoded absolute URL, NOT `window.location.origin +
 * pathname` the way the app's own src/data/auth.ts does it. The app can use
 * "come back where you started" because every page it starts from is the app.
 * A landing page cannot: returning the coach to /football-parent-coach-app
 * would drop them on a static page with no Supabase client listening, and
 * with the default implicit flow the `#access_token=...` fragment would sit
 * there unparsed - the coach looking at a marketing page, apparently signed
 * out, while holding a perfectly valid session.
 *
 * Must be listed under Auth > URL Configuration in the coach-app Supabase
 * project, or Supabase silently falls back to that project's Site URL.
 *
 * The www is load-bearing: localStorage does not span www and the bare
 * domain, so returning to the wrong host would strand the session on an
 * origin the app never reads. The bare domain 308s to www (confirmed
 * 2026-09-07), so every coach reaching the form is already on this host.
 */
export const COACH_APP_URL = "https://www.footballparent.co.uk/coach-app/";

/** The query param naming the form a sign-in started on. Keep in sync with
 * SIGNUP_SURFACE_PARAM in src/data/signupSurface.ts in the coach-app repo. */
const SIGNUP_SURFACE_PARAM = "via";

/** COACH_APP_URL plus the path of the page whose form the coach used, so
 * the app's anonymous sign-up event can say which form it came from even
 * when the landing hand-off (lib/coach-app-handoff.ts) was never written:
 * no analytics consent, or an email link opened in a mail app's own
 * browser, whose storage is not this one. Those were the sign-ups the
 * funnel reported as "Unknown" with no page at all. The param carries a
 * page path and nothing about the coach, and it needs no storage.
 *
 * Still on the www host, so it is accepted as a redirect the same way the
 * bare COACH_APP_URL is (the app's own sign-ins already return to paths
 * below it, e.g. /coach-app/join/<token>). */
export function coachAppRedirectFrom(pagePath: string): string {
  return `${COACH_APP_URL}?${SIGNUP_SURFACE_PARAM}=${encodeURIComponent(pagePath)}`;
}

function redirectTarget(): string {
  return typeof window === "undefined" ? COACH_APP_URL : coachAppRedirectFrom(window.location.pathname);
}

let client: SupabaseClient | null = null;

/** Null when the env vars are missing, so the form can degrade to a plain
 * link rather than throwing on a page that is mostly marketing copy. */
export function getCoachAppAuth(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

export type SignInResult = { error: string | null };

export async function signInWithGoogle(): Promise<SignInResult> {
  const supabase = getCoachAppAuth();
  if (!supabase) return { error: "unconfigured" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTarget(),
      // Matches the app's own sign-in: without this Google silently reuses
      // whichever account the browser is already signed in to, instead of
      // showing the account picker.
      queryParams: { prompt: "select_account" },
    },
  });

  return { error: error?.message ?? null };
}

export async function signInWithEmail(email: string): Promise<SignInResult> {
  const supabase = getCoachAppAuth();
  if (!supabase) return { error: "unconfigured" };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    // emailRedirectTo, not redirectTo - signInWithOtp's own option name for
    // where the link in the email lands.
    options: { emailRedirectTo: redirectTarget() },
  });

  return { error: error?.message ?? null };
}
