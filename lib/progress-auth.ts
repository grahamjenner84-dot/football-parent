import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client for PROGRESS, the parents' app
// (progress.footballparent.co.uk), used by the join form on /progress so a
// parent can start their trial without leaving the page.
//
// This is a sanctioned exception, approved by Graham on 2026-09-27, to the
// rule that nothing public-facing gets the Progress project's credentials
// (that project holds children's data). The limits are the point:
//
// - Anon key only (NEXT_PUBLIC_PROGRESS_SUPABASE_URL / _ANON_KEY). It is
//   already public in the Progress app's own JS bundle. The service-role key
//   must never come anywhere near this repo.
// - Browser only, auth only: signInWithOtp and, since 2026-10-18 (approved
//   by Graham that day, so "Sign up with Google" signs a parent straight in
//   instead of opening the app first), signInWithOAuth for Google, and
//   nothing else. No table reads, no writes, no server-side use, no session
//   kept on this site (the session is created in the app, when the parent
//   taps the link in the email or comes back from Google).
// - Never imported from social/content-automation code (lib/instagram/,
//   scripts/, app/api/cron). Anything beyond sending a sign-in email or
//   starting Google sign-in is a new decision, not an extension of this one.
//
// Unlike the Coach App (a same-origin rewrite, see lib/coach-app-auth.ts),
// Progress lives on its own subdomain, so nothing is shared through
// localStorage. The email link goes to Supabase's verify endpoint, and Google
// to Supabase's callback, and then to the app with the session in the URL
// fragment, which the app's client reads on load. That only works with the
// implicit flow: PKCE would leave the code verifier here, on www, where the
// app can never read it.
//
// The return URL must be allowed under Auth > URL Configuration in the
// Progress Supabase project (https://progress.footballparent.co.uk/** is).

const url = process.env.NEXT_PUBLIC_PROGRESS_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_PROGRESS_SUPABASE_ANON_KEY;

export const PROGRESS_APP_URL = "https://progress.footballparent.co.uk/";

let client: SupabaseClient | null = null;

/** False when the env vars are missing; the form then hands the email to
 * the app's own sign-in screen instead of sending the link itself. */
export function progressAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}

function getClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Send the Progress sign-in email. New emails get an account and a 4-week
 * trial (the app's database trigger); existing ones just sign in. The link
 * returns to the app's root with nothing added: the join form no longer
 * asks for a marketing choice, so there is no ?marketing= to carry. */
export async function sendProgressSignInLink(email: string): Promise<{ error: string | null }> {
  const supabase = getClient();
  if (!supabase) return { error: "unconfigured" };

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: PROGRESS_APP_URL },
  });
  return { error: error?.message ?? null };
}

/** Start Google sign-in for Progress from this site: leaves the page for
 * Google, which returns the parent to the app signed in (a new Google
 * account gets the same 4-week trial). ?from=site-<form> lets the app count
 * whether it signed them in, as that form's google-done or google-error step
 * (src/lib/joinFormTracking.ts in the progress repo). On an error, or when
 * unconfigured, the caller falls back to the app's own Google start
 * (?signin=google). */
export async function startProgressGoogleSignIn(form: "join" | "join-trial"): Promise<{ error: string | null }> {
  const supabase = getClient();
  if (!supabase) return { error: "unconfigured" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${PROGRESS_APP_URL}?from=site-${form}`,
      // As in the app: let a parent with two Google accounts pick the right one.
      queryParams: { prompt: "select_account" },
    },
  });
  return { error: error?.message ?? null };
}
