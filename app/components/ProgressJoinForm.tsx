"use client";

import { useState, type FormEvent } from "react";
import { PROGRESS_APP_URL, progressAuthConfigured, sendProgressSignInLink } from "@/lib/progress-auth";
import { currentVisitSource } from "@/lib/coach-app-handoff";

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

// "Start your journey" on /progress: the parent types their email here and
// Progress emails them a sign-in link straight away. See lib/progress-auth.ts
// for why this site may do that and exactly how far it goes.
//
// Without the env vars it degrades to a plain GET to the app, whose sign-in
// screen fills the email in (?email=) and sends the link from there.

export default function ProgressJoinForm({ id, dark = false }: { id?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const configured = progressAuthConfigured();
  const inputId = id ? `${id}-email` : undefined;
  const text = dark ? "text-white" : "text-[#16211b]";
  const muted = dark ? "text-[#c9d3c4]" : "text-[#5d6b60]";
  const link = dark ? "text-white underline" : "text-[#0f5d34] underline";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!configured) return; // let the plain GET to the app happen
    e.preventDefault();
    setStatus("sending");
    setError("");
    const { error } = await sendProgressSignInLink(email, marketing);
    if (error) {
      setError(
        /rate limit|too many/i.test(error)
          ? "We've sent a few links already. Please wait a minute and try again."
          : "Sorry, that didn't work. Check your email address and try again.",
      );
      setStatus("idle");
      return;
    }
    logJoin(id, marketing);
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div id={id} className="w-full max-w-md scroll-mt-24" role="status">
        <p className={`text-lg font-bold mb-2 ${text}`}>Check your email</p>
        <p className={`m-0 ${muted}`}>
          We&apos;ve sent a sign-in link to <strong className={text}>{email.trim()}</strong>. Tap it
          and Progress opens, ready to set up your child&apos;s first team. Open it on the phone
          you&apos;ll use at matches.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={`mt-3 text-sm font-semibold ${dark ? "text-white" : "text-[#0f5d34]"} underline cursor-pointer`}
        >
          Use a different email
        </button>
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
          disabled={status === "sending"}
          className="rounded-full bg-[#1a7a45] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#0f5d34] disabled:opacity-60 cursor-pointer"
        >
          {status === "sending" ? "Sending…" : "Start free trial"}
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
        <p className={`mt-3 text-sm ${dark ? "text-[#f2a09b]" : "text-red-700"}`} role="alert">
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
