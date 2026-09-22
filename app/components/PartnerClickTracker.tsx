"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isOutboundPartnerLink } from "@/lib/outbound-partners";
import { isPageViewOptedOut } from "@/lib/page-view-optout";

// First-party measurement of clicks out to editorial partners (Football DNA
// today). The point is to answer "how much traffic are we sending this
// partner", which is exactly what a sponsor asks for and what justifies a
// sponsorship - and nothing else measures it. GA4's outbound click event is
// gated on analytics consent, so it only ever sees the accepting minority of
// visitors; this fires for everyone.
//
// A near-copy of AffiliateClickTracker deliberately kept SEPARATE rather than
// folded into it: affiliate links are monetised and nofollowed for Amazon
// compliance, partner links are editorial and must not be, so the two concerns
// don't share a code path. A second document-level listener is negligible.
//
// One delegated listener on the document rather than an onClick per anchor:
// partner links are plain markdown links rendered by the server-side MDX
// renderer, so there's no client component to hang a handler on. A document
// listener catches every partner link on the site, including future ones, with
// nothing to wire up.
export default function PartnerClickTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Same exclusions as AffiliateClickTracker/PageViewPing: /admin is Graham
    // checking the dashboard, the opt-out flag is his own browsing, and
    // localhost is a dev server whose clicks would otherwise write real rows
    // into the production table.
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

    // Collapses the double-fire of one physical click (a click plus, in some
    // browsers, an auxclick for the same press), not genuine repeat interest.
    const lastSent = new Map<string, number>();
    const DEDUPE_MS = 500;

    function report(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      // anchor.href is the resolved absolute URL, which is what
      // isOutboundPartnerLink needs - the attribute alone could be relative.
      const href = anchor.href;
      if (!href || !isOutboundPartnerLink(href)) return;

      const now = Date.now();
      const previous = lastSent.get(href);
      if (previous && now - previous < DEDUPE_MS) return;
      lastSent.set(href, now);

      const payload = JSON.stringify({
        path: pathname,
        href,
        linkText: (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      });

      // sendBeacon survives the tab losing focus, which a plain fetch does not
      // reliably do. Falls back to keepalive fetch where it is missing or
      // refuses the payload.
      let sent = false;
      try {
        sent = navigator.sendBeacon?.(
          "/api/partner-click",
          new Blob([payload], { type: "application/json" })
        );
      } catch {
        sent = false;
      }

      if (!sent) {
        fetch("/api/partner-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }

      // Same click in GA4 for anyone who granted analytics consent, so it's
      // also sliceable there. The Supabase row is the number to trust.
      const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
      w.gtag?.("event", "partner_click", {
        link_url: href,
        link_text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 100),
        page_path: pathname,
      });
    }

    function onClick(event: MouseEvent) {
      report(event);
    }

    // auxclick restricted to button 1 (middle-click); a right-click also raises
    // auxclick and opening a context menu is not a click-out.
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
