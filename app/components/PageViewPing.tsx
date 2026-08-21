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
    fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
