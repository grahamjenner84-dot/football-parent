"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isAffiliateLink } from "@/lib/affiliate";
import { isPageViewOptedOut } from "@/lib/page-view-optout";

// First-party measurement of clicks out to Amazon.
//
// Amazon Associates only reports from the point a click lands on Amazon,
// aggregated per tracking id rather than per page, so it cannot answer
// "which article sends people to Amazon, and what share of its readers
// click". This can, from our side of the link, and it keeps working on a
// day with no orders at all.
//
// One delegated listener on the document rather than an onClick prop on
// each anchor, deliberately: affiliate links are rendered in two different
// places today (the `a` override in lib/MDXContent.tsx and the buttons in
// app/components/mdx/GearPicks.tsx) and both are server components. A
// document-level listener catches every affiliate link on the site,
// including any future component, with nothing to remember to wire up -
// the same reason the rel/target attributes are centralised in
// lib/affiliate.ts.
//
// The GA4 event fires alongside this, so the data is also in GA for
// anything easier to slice there. The Supabase row is the number to trust:
// the GA4 event is gated on analytics consent and so only ever sees the
// accepting share of visitors.
export default function AffiliateClickTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Same exclusions as PageViewPing, and for the same reasons: /admin is
    // Graham checking the dashboard, the opt-out flag is his own browsing,
    // and localhost is a dev server whose clicks would otherwise write real
    // rows into the production table.
    if (!pathname || pathname.startsWith("/admin")) return;
    if (isPageViewOptedOut()) return;

    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".local")
    ) {
      return;
    }

    // Affiliate links open in a new tab (target="_blank", set in
    // lib/affiliate.ts), so a reader who comes back and clicks the same link
    // again is a real second click. This only collapses the double-fire of
    // one physical click - a click event plus, in some browsers, an auxclick
    // for the same press - not genuine repeat interest.
    const lastSent = new Map<string, number>();
    const DEDUPE_MS = 500;

    function report(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      // anchor.href is the resolved absolute URL, which is what
      // isAffiliateLink needs - the attribute alone could be relative.
      const href = anchor.href;
      if (!href || !isAffiliateLink(href)) return;

      const now = Date.now();
      const previous = lastSent.get(href);
      if (previous && now - previous < DEDUPE_MS) return;
      lastSent.set(href, now);

      // Which component rendered the link, so the quick-picks box can be
      // compared against ordinary inline links in the prose. GearPicks sets
      // the attribute; anything else is inline by default.
      const placement =
        anchor.closest("[data-affiliate-placement]")?.getAttribute("data-affiliate-placement") ??
        "inline";

      const payload = JSON.stringify({
        path: pathname,
        href,
        // The readable half of an amzn.to short link: the product name as
        // the reader saw it.
        linkText: (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
        placement,
      });

      // sendBeacon survives the tab losing focus, which a plain fetch does
      // not reliably do. Falls back to keepalive fetch where it is missing
      // or refuses the payload (it can return false when its queue is full).
      let sent = false;
      try {
        sent = navigator.sendBeacon?.(
          "/api/affiliate-click",
          new Blob([payload], { type: "application/json" })
        );
      } catch {
        sent = false;
      }

      if (!sent) {
        fetch("/api/affiliate-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }

      // Same click in GA4, for anyone who granted analytics consent. Named
      // affiliate_click rather than GA4's automatic outbound `click` event
      // because that one is collected only with enhanced measurement on and
      // cannot carry the page/placement dimensions above.
      const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
      w.gtag?.("event", "affiliate_click", {
        link_url: href,
        link_text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 100),
        page_path: pathname,
        placement,
      });
    }

    // click covers the primary button and keyboard activation; auxclick is
    // restricted to button 1 (middle-click, "open in background tab"), since
    // a right-click also raises auxclick and opening a context menu is not
    // a click-out.
    function onClick(event: MouseEvent) {
      report(event);
    }

    function onAuxClick(event: MouseEvent) {
      if (event.button === 1) report(event);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onAuxClick);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onAuxClick);
    };
  }, [pathname]);

  return null;
}
