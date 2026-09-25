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
type ShareMethod = "share-sheet" | "share-cancelled" | "clipboard" | "email";

// First-party count of every tap, into coach_app_shares via
// /api/coach-app-share (anonymous, so not consent-gated). Fire and forget:
// measurement must never get in the way of the share itself.
function logShare(variant: string, method: ShareMethod) {
  try {
    fetch("/api/coach-app-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, variant, method }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nothing to do.
  }
  // Also to GA4, which only sees consenting visitors, so undercounts.
  (window as typeof window & { gtag?: Gtag }).gtag?.("event", "coach_app_share", { method, variant });
}

export default function CoachAppShareButton({
  tone,
  variant,
}: {
  tone: "dark" | "light";
  /** The banner variant carrying the button, e.g. dark-share-article. */
  variant: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Football Parent Coach App", text: SHARE_TEXT, url: SHARE_URL });
        logShare(variant, "share-sheet");
      } catch {
        // Dismissed the share sheet. Still worth knowing: lots of opens and
        // few sends says the idea lands but the moment doesn't.
        logShare(variant, "share-cancelled");
      }
      return;
    }

    // Desktop browsers mostly lack the share sheet: copy instead.
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      logShare(variant, "clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      logShare(variant, "email");
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
