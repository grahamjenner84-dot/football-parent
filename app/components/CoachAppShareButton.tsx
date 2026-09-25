"use client";

import { useState } from "react";

// "Send this to your child's coach", on the share-audience Coach App banner.
//
// Most readers of the grassroots articles are parents, not coaches, but
// nearly every grassroots coach is somebody's parent, and the parent reading
// is usually one WhatsApp message away from them. This turns the banner from
// "sign up" (which a parent has no reason to do) into "pass it on" (which
// they can do in two taps).
//
// The shared link carries utm_* rather than the banner's private ?b= param:
// it's an external share arriving from WhatsApp or a text, which is exactly
// what utm is for, and a ?b= landing would count as a banner click in the
// Coach App report. PageViewPing and the sign-up handoff both record utm, so
// a coach who signs up from a shared link is attributed to it.
const SHARE_URL =
  "https://www.footballparent.co.uk/football-parent-coach-app?utm_source=parent-share&utm_medium=referral&utm_campaign=coach-app-banner";

const SHARE_TEXT =
  "Thought this might help with subs and game time on matchdays: a free app for grassroots coaches that works out fair playing time for you.";

type Gtag = (...args: unknown[]) => void;

export default function CoachAppShareButton({ tone }: { tone: "dark" | "light" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const w = window as typeof window & { gtag?: Gtag };
    // Consent-gated like every gtag call, so an undercount. There is no
    // first-party count of share taps; the shared link's own utm landings
    // in page_views are the number that matters.
    w.gtag?.("event", "coach_app_share");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Football Parent Coach App", text: SHARE_TEXT, url: SHARE_URL });
      } catch {
        // Cancelled from the share sheet. Nothing to do.
      }
      return;
    }

    // Desktop browsers mostly lack the share sheet: copy instead.
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.location.href = `mailto:?subject=${encodeURIComponent("Football Parent Coach App")}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`)}`;
    }
  }

  const className =
    tone === "dark"
      ? "inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      : "inline-flex items-center justify-center rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white! transition-colors hover:bg-blue-800";

  return (
    <button type="button" onClick={() => void share()} className={className}>
      {copied ? "Link copied" : "Send it to your child's coach"}
    </button>
  );
}
