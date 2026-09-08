"use client";

import { useState, type FormEvent } from "react";
import {
  COACH_APP_URL,
  getCoachAppAuth,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/coach-app-auth";
import { stashLandingHandoff } from "@/lib/coach-app-handoff";

// The sign-up form itself, embedded directly on the Coach App landing page so
// a visitor converts on the page they arrived at. Before this existed the CTA
// was a link to /coach-app, which is the app's own AuthGate - a second full
// marketing page (hero, feature carousel, trust badges) before any form. PPC
// traffic was therefore pitched twice before being asked to do anything.
//
// Google sign-in still navigates away, which is inherent to OAuth. What
// changes is that the coach commits on this page first, and the navigation
// they experience lands them in the product rather than on more marketing.
//
// See lib/coach-app-auth.ts for why a session created here is readable by the
// app, and why the redirect target is hardcoded rather than "current page".

type Props = {
  /** Overridden per landing page variant so the button can echo the ad's
   * promise ("Start tracking game time") rather than a generic label. */
  ctaLabel?: string;
};

export default function CoachSignUpForm({
  ctaLabel = "Start free with Google",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  // Missing env vars shouldn't blank out the primary CTA on a page that is
  // otherwise fine - fall back to the old link-to-the-app behaviour.
  const configured = getCoachAppAuth() !== null;

  async function handleGoogle() {
    setError(null);
    // Written at the moment of intent, not on page load: this is the page
    // the coach actually acted on, and a passive visit shouldn't claim
    // credit for a signup that happens from somewhere else later.
    stashLandingHandoff();
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Coach App Google sign-in failed:", error);
      setError("Couldn't open Google sign-in. Try the email option instead.");
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    stashLandingHandoff();

    const { error } = await signInWithEmail(email.trim());
    if (error) {
      // Supabase surfaces raw provider text here, sometimes literally "{}"
      // when the mail backend fails before it can build a message. The app's
      // own AuthGate learned this the hard way - full detail to the console,
      // something human on screen.
      console.error("Coach App email sign-in failed:", error);
      setError("Something went wrong sending that email. Please try again, or use Google instead.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (!configured) {
    return (
      <a
        href={COACH_APP_URL}
        className="inline-block bg-blue-700 hover:bg-blue-800 text-white! font-semibold px-8 py-3 rounded-lg transition-colors"
      >
        Try the Coach App
      </a>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-md">
      <p className="text-sm font-semibold text-gray-900 mb-4">
        Set your team up in a couple of minutes
      </p>

      {status === "sent" ? (
        <p className="text-gray-700" role="status">
          Check your email. We&apos;ve sent a sign-in link to{" "}
          <strong className="font-semibold">{email.trim()}</strong> — tap it and
          the app opens straight up.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void handleGoogle()}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white! font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {ctaLabel}
          </button>

          <div className="flex items-center gap-3 my-4" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">or</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={(e) => void handleEmail(e)} className="flex flex-col gap-2">
            <label htmlFor="coach-signup-email" className="text-sm text-gray-700">
              Sign in with an email link
            </label>
            <input
              id="coach-signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {status === "sending" ? "Sending…" : "Email me a link"}
            </button>
          </form>
        </>
      )}

      {error && (
        <p className="text-sm text-red-700 mt-3" role="alert">
          {error}
        </p>
      )}

      {/* "No card required" because the page raises the question itself: it
          shows a price and says "cancel any time", which invites "am I
          signing up to something that charges me". Accurate as written -
          Stripe is only reached from the upgrade flow inside the app, never
          at sign-up. */}
      <p className="text-xs text-gray-500 mt-4">
        Free to get started, no card required. By continuing you agree to our{" "}
        <a href="/terms-and-conditions" className="underline">
          Terms &amp; Conditions
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" className="underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
