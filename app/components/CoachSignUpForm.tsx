"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  COACH_APP_URL,
  getCoachAppAuth,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/coach-app-auth";
import { stashLandingHandoff } from "@/lib/coach-app-handoff";
import { trackSignupFormStep } from "@/lib/coach-app-form-tracking";

// The sign-up form itself, embedded directly on the Coach App landing page so
// a visitor converts on the page they arrived at. Before this existed the CTA
// was a link to /coach-app, which is the app's own AuthGate - a second full
// marketing page (hero, feature carousel, trust badges) before any form. PPC
// traffic was therefore pitched twice before being asked to do anything.
//
// The Google button's label is fixed and says "Google" on purpose. It was
// briefly driven by the variant's ctaLabel, so an ad group could put its own
// promise on it - which meant the calculator page shipped a button reading
// "Manage equal game time" that in fact opened Google OAuth. Anyone without a
// Google account clicked a benefit and hit a wall. A button has to name what
// it does; the variant's promise now sits on the heading above it instead.
//
// Google sign-in still navigates away, which is inherent to OAuth. What
// changes is that the coach commits on this page first, and the navigation
// they experience lands them in the product rather than on more marketing.
//
// See lib/coach-app-auth.ts for why a session created here is readable by the
// app, and why the redirect target is hardcoded rather than "current page".

// The comic-accent primary button: the app's own yellow (its "Help me pick"
// and "Save lineup" buttons) with ink text, ink outline and a hard offset
// shadow that lifts on hover, as on the site header's app pills.
const PRIMARY_BUTTON =
  "rounded-full border-2 border-[#201E1D] bg-[#FFC400] font-bold text-[#201E1D]! shadow-[4px_4px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#201E1D]";

type Props = {
  /** Overridden per landing page variant so the form can echo the ad's
   * promise. Sits on the heading above the buttons, never on the buttons
   * themselves - see the Google button below for why. */
  heading?: string;
};

export default function CoachSignUpForm({
  heading = "Set your team up in a couple of minutes",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  // Google first, the email form on request: the same as the app's own
  // sign-in screens. Every Google sign-up gets into the app; about a third
  // of email sign-ups never opened the link.
  const [emailOpen, setEmailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Missing env vars shouldn't blank out the primary CTA on a page that is
  // otherwise fine - fall back to the old link-to-the-app behaviour.
  const configured = getCoachAppAuth() !== null;

  // "Seen", not "rendered": the page has two of these, and the lower one is
  // a long scroll down. Half the form on screen counts, once per page load
  // whichever form it was (lib/coach-app-form-tracking.ts).
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackSignupFormStep("view");
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [configured]);

  async function handleGoogle() {
    setError(null);
    // Written at the moment of intent, not on page load: this is the page
    // the coach actually acted on, and a passive visit shouldn't claim
    // credit for a signup that happens from somewhere else later.
    stashLandingHandoff();
    trackSignupFormStep("google");
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Coach App Google sign-in failed:", error);
      trackSignupFormStep("google-error");
      setError("Couldn't open Google sign-in. Try the email option instead.");
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    stashLandingHandoff();
    trackSignupFormStep("email");

    const { error } = await signInWithEmail(email.trim());
    if (error) {
      // Supabase surfaces raw provider text here, sometimes literally "{}"
      // when the mail backend fails before it can build a message. The app's
      // own AuthGate learned this the hard way - full detail to the console,
      // something human on screen.
      console.error("Coach App email sign-in failed:", error);
      trackSignupFormStep("email-error");
      setError("Something went wrong sending that email. Please try again, or use Google instead.");
      setStatus("idle");
      return;
    }
    trackSignupFormStep("email-sent");
    setStatus("sent");
  }

  if (!configured) {
    return (
      <a
        href={COACH_APP_URL}
        className={`inline-block px-8 py-3 text-[17px] ${PRIMARY_BUTTON}`}
      >
        Try the Coach App
      </a>
    );
  }

  return (
    <div
      ref={formRef}
      className="w-full max-w-md rounded-2xl border-[3px] border-[#201E1D] bg-white p-6 text-[#201E1D] shadow-[6px_6px_0_#201E1D]"
    >
      <p className="mb-4 text-[17px] font-bold leading-snug">{heading}</p>

      {status === "sent" ? (
        <p className="text-[#3A3836]" role="status">
          Check your email. We&apos;ve sent a sign-in link to{" "}
          <strong className="font-semibold">{email.trim()}</strong>: tap it and
          the app opens straight up.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void handleGoogle()}
            className={`w-full px-6 py-3 text-[17px] ${PRIMARY_BUTTON}`}
          >
            Sign up with Google
          </button>

          {emailOpen ? (
          <form onSubmit={(e) => void handleEmail(e)} className="flex flex-col gap-2 mt-4">
            <label htmlFor="coach-signup-email" className="text-sm font-medium text-[#3A3836]">
              Sign up with an email link
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
              // Opened on purpose a moment ago: the keyboard can come straight up.
              autoFocus
              className="rounded-xl border-2 border-[#201E1D] px-3 py-2.5 text-[#201E1D] focus:outline-none focus:ring-2 focus:ring-[#1F5FD6] focus:ring-offset-2"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full border-2 border-[#201E1D] bg-white px-6 py-2.5 font-bold text-[#201E1D] transition hover:bg-[#FFF8E1] disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Email me a link"}
            </button>
          </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                trackSignupFormStep("email-open");
                setEmailOpen(true);
              }}
              className="mx-auto mt-4 block text-sm font-medium text-[#3A3836] underline underline-offset-4 hover:text-[#201E1D]"
            >
              No Google? Email me a sign-in link instead
            </button>
          )}
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
      <p className="mt-4 text-xs text-[#5A5650]">
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
