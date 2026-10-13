"use client";

import { useEffect, useRef, type RefObject } from "react";
import { isPageViewOptedOut } from "@/lib/page-view-optout";

// "Banner seen" for the Progress banner (ProgressBanner.tsx and the test
// island ProgressBannerTestArm.tsx): the first time at least half of the
// banner is on screen while the tab is visible, one anonymous event goes to
// /api/progress-banner-seen with the page and the banner's ?b= value (which
// carries its placement and test arm). At most once per mount, i.e. once per
// page view. Nothing is stored in the browser.
//
// Same consent basis and the same exclusions as the page-view count
// (PageViewPing.tsx): not consent-gated, because the row is anonymous; not
// from /admin, from a browser opted out of page-view logging, from local
// development, or on a 404.

const SEEN_RATIO = 0.5;

function shouldLog(): boolean {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return false;
  if (isPageViewOptedOut()) return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local")) return false;
  if (document.querySelector("[data-fp-not-found]")) return false;
  return true;
}

function logSeen(banner: string) {
  try {
    fetch("/api/progress-banner-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, banner }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Measurement must never get in the way of the page.
  }
}

/** Observe `ref` and log one "seen" for `banner`. `banner` null means the
 * value isn't final yet (the test island before it has drawn an arm), so
 * nothing is observed until it is. */
export function useProgressBannerSeen(ref: RefObject<HTMLElement | null>, banner: string | null) {
  const sent = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !banner || sent.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    let inView = false;
    const fire = () => {
      if (sent.current || !inView || document.visibilityState !== "visible") return;
      sent.current = true;
      cleanup();
      if (shouldLog()) logSeen(banner);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView = entry.isIntersecting && entry.intersectionRatio >= SEEN_RATIO;
        fire();
      },
      { threshold: SEEN_RATIO }
    );
    // A page opened in a background tab can have the banner in view before
    // anyone looks: count it when the tab comes to the front instead.
    const onVisibility = () => fire();

    function cleanup() {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    }

    observer.observe(el);
    document.addEventListener("visibilitychange", onVisibility);
    return cleanup;
  }, [ref, banner]);
}
