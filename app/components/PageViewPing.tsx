"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// True total page-view count, deliberately decoupled from CookieConsent.tsx
// entirely - fires on every route regardless of consent state, so it
// doesn't inherit the "only fires when the banner is shown" undercount
// (a returning visitor with a stored decision never sees the banner again,
// so cookie_consent_events.banner_shown misses them - see the comment on
// the page_views migration). This is the number to check against GA
// sessions to tell a real traffic drop from a consent-visibility artifact.
export default function PageViewPing() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip /admin/* - that's Graham checking the dashboard, not a real
    // visitor, and would otherwise inflate the count it's meant to report.
    if (!pathname || pathname.startsWith("/admin")) return;

    // document.referrer is only the immediately preceding page, not the
    // original session entry point - so on-site navigation (page 2, 3...
    // of the same visit) reports our own hostname here. That's classified
    // as "Internal" server-side and excluded from the source breakdown,
    // which is what makes it possible to approximate "where visits came
    // from" without needing a session id: only true entry pageviews carry
    // an external referrer.
    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      referrerHost = null;
    }

    fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrerHost }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
