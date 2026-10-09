"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { PROGRESS_APP_URL, progressAuthConfigured, sendProgressSignInLink } from "@/lib/progress-auth";
import { currentVisitSource } from "@/lib/coach-app-handoff";
import { trackProgressSignUpConversion } from "@/lib/ads-tracking";

// One anonymous event per sent link, for the Progress pipeline on
// /admin/seo (see /api/progress-join). Never the email address. Fire and
// forget: measurement must never get in the way of signing up.
function logJoin(form: string | undefined, marketing: boolean) {
  try {
    fetch("/api/progress-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form: form ?? null,
        banner: new URLSearchParams(window.location.search).get("b"),
        marketingOptIn: marketing,
        ...currentVisitSource(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// Which email the sign-in link went to, shared by every copy of the form on
// the page: /progress has two ("join" at the top, "join-trial" at the
// bottom), and parents who didn't trust the first send used to fill in the
// second a minute later. Once either sends, both show "Check your email",
// with a resend button instead of a second form.
type Sent = { email: string; marketing: boolean; sentAt: number };
let sent: Sent | null = null;
const listeners = new Set<() => void>();
function setSent(next: Sent | null) {
  sent = next;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const useSent = () =>
  useSyncExternalStore(
    subscribe,
    () => sent,
    () => null,
  );

// Supabase allows one sign-in email per address a minute, so the resend
// button waits that long.
const RESEND_AFTER_MS = 60_000;

function friendlyError(error: string) {
  return /rate limit|too many|seconds/i.test(error)
    ? "We've sent a few links already. Please wait a minute and try again."
    : "Sorry, that didn't work. Check your email address and try again.";
}

function ResendButton({ sentAt, dark, onResend, busy }: { sentAt: number; dark: boolean; onResend: () => void; busy: boolean }) {
  const [now, setNow] = useState(sentAt);
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= sentAt + RESEND_AFTER_MS) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [sentAt]);
  const wait = Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000));
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={wait > 0 || busy}
      className={`text-sm font-semibold underline cursor-pointer disabled:cursor-default disabled:no-underline disabled:opacity-60 ${dark ? "text-white" : "text-[#0f5d34]"}`}
    >
      {busy ? "Sending…" : wait > 0 ? `Send it again (${wait}s)` : "Send it again"}
    </button>
  );
}

// "Start your journey" on /progress: the parent types their email here and
// Progress emails them a sign-in link straight away. See lib/progress-auth.ts
// for why this site may do that and exactly how far it goes.
//
// Without the env vars it degrades to a plain GET to the app, whose sign-in
// screen fills the email in (?email=) and sends the link from there.

export default function ProgressJoinForm({ id, dark = false }: { id?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const sentTo = useSent();
  const configured = progressAuthConfigured();
  const inputId = id ? `${id}-email` : undefined;
  const text = dark ? "text-white" : "text-[#16211b]";
  const muted = dark ? "text-[#c9d3c4]" : "text-[#5d6b60]";
  const link = dark ? "text-white underline" : "text-[#0f5d34] underline";
  const errorText = `mt-3 text-sm ${dark ? "text-[#f2a09b]" : "text-red-700"}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!configured) return; // let the plain GET to the app happen
    e.preventDefault();
    setSending(true);
    setError("");
    const { error } = await sendProgressSignInLink(email, marketing);
    setSending(false);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    // One join event and one Ads conversion per send from the form. The
    // resend button below logs neither, and the conversion fires at most
    // once per page load whatever happens (lib/ads-tracking.ts).
    logJoin(id, marketing);
    trackProgressSignUpConversion();
    setResent(false);
    setSent({ email: email.trim(), marketing, sentAt: Date.now() });
  }

  async function onResend() {
    if (!sentTo) return;
    setResending(true);
    setError("");
    const { error } = await sendProgressSignInLink(sentTo.email, sentTo.marketing);
    setResending(false);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    setResent(true);
    setSent({ ...sentTo, sentAt: Date.now() });
  }

  if (sentTo) {
    return (
      <div id={id} className="w-full max-w-md scroll-mt-24" role="status">
        <p className={`text-lg font-bold mb-2 ${text}`}>Check your email</p>
        <p className={`m-0 ${muted}`}>
          We&apos;ve {resent ? "sent another" : "sent a"} sign-in link to{" "}
          <strong className={text}>{sentTo.email}</strong>. Tap it and Progress opens, ready to set
          up your child&apos;s first team. Open it on the phone you&apos;ll use at matches.
        </p>
        <p className={`mt-3 mb-0 text-sm ${muted}`}>
          Not there after a minute? Check your Spam and Promotions folders.
        </p>
        {error && (
          <p className={errorText} role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <ResendButton
            key={sentTo.sentAt}
            sentAt={sentTo.sentAt}
            dark={dark}
            busy={resending}
            onResend={() => void onResend()}
          />
          <button
            type="button"
            onClick={() => {
              setError("");
              setResent(false);
              setSent(null);
            }}
            className={`text-sm font-semibold ${dark ? "text-white" : "text-[#0f5d34]"} underline cursor-pointer`}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id={id}
      action={PROGRESS_APP_URL}
      method="get"
      onSubmit={(e) => void onSubmit(e)}
      className="w-full max-w-md scroll-mt-24"
    >
      <p className={`text-lg font-bold mb-3 ${text}`}>Start your journey</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={inputId} className="sr-only">
          Your email
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          inputMode="email"
          required
          autoComplete="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 rounded-full border border-[#c3ccb8] bg-white px-5 py-3.5 text-base text-[#16211b] placeholder:text-[#8a978d] focus:outline-none focus:ring-2 focus:ring-[#1a7a45]"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-[#1a7a45] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0f5d34] disabled:opacity-60 cursor-pointer"
        >
          {sending ? "Sending…" : "Start free trial"}
        </button>
      </div>
      {configured && (
        <label className={`mt-3 flex items-start gap-2 text-sm ${muted} cursor-pointer`}>
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1 accent-[#1a7a45]"
          />
          <span>Email me occasional Progress updates and offers from Football Parent.</span>
        </label>
      )}
      {error && (
        <p className={errorText} role="alert">
          {error}
        </p>
      )}
      <p className={`mt-3 text-sm ${muted}`}>
        {configured
          ? "We'll email you a link to sign in. No password needed."
          : "We'll take you to Progress to send your sign-in link. No password needed."}{" "}
        By continuing you agree to the Progress{" "}
        <a href={`${PROGRESS_APP_URL}terms`} className={link}>
          Terms
        </a>{" "}
        and{" "}
        <a href={`${PROGRESS_APP_URL}privacy`} className={link}>
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
