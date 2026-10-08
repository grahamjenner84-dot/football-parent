// Editorial partners whose outbound links we count first-party, so we can
// answer "how much traffic are we actually sending them" - the number that
// justifies a sponsorship, and the one a partner will ask for.
//
// This is deliberately SEPARATE from lib/affiliate.ts and must stay that way:
//   - Affiliate links are monetised and get rel="sponsored nofollow" (Amazon
//     Associates and Google both require it). Partner links here are
//     EDITORIAL - a nofollow on them would wrongly strip the link equity we
//     are giving a partner on purpose, so nothing in this file touches rel or
//     target. Do NOT add a partner host to AFFILIATE_HOSTS to get tracking;
//     that would nofollow it. The two lists exist precisely so the same host
//     can never be both.
//   - The click tracker and endpoint for these live in their own files
//     (PartnerClickTracker / /api/partner-click / lib/supabase/partner-clicks)
//     and never touch the Amazon compliance path.
//
// Football DNA is the only editorial partner today. Instagram is our own
// account, not a partner, but its follow links need exactly the same "how
// many readers clicked out, from which page" count, so it rides the same
// table and tracker under its own slug; the admin report filters by slug so
// its clicks never mix into a partner's click-through rate.

export interface OutboundPartner {
  // Stable identifier stored on each click row and used in the report.
  slug: string;
  // Human label shown in the admin dashboard.
  label: string;
  // Registrable hostnames for this partner. A click counts when its
  // destination host equals one of these or is a subdomain of it.
  hosts: string[];
  // When click logging for this destination went live (start of the deploy
  // day, UTC). The report clamps its window to it so the click-through rate
  // never divides by page views from before any click could be recorded.
  trackingStartedAt: string;
}

export const OUTBOUND_PARTNERS: OutboundPartner[] = [
  {
    slug: "football-dna",
    label: "Football DNA",
    hosts: ["footballdna.co.uk"],
    trackingStartedAt: "2026-09-22T00:00:00Z",
  },
  {
    slug: "instagram",
    label: "Instagram",
    hosts: ["instagram.com"],
    // Update to the day this goes live if it merges later.
    trackingStartedAt: "2026-10-08T00:00:00Z",
  },
];

// The partner a destination URL belongs to, or null if it is not a tracked
// partner link. Takes the resolved absolute href (anchor.href), so a relative
// attribute can't slip through as a match.
export function matchOutboundPartner(href: string): OutboundPartner | null {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
  return (
    OUTBOUND_PARTNERS.find((p) =>
      p.hosts.some((h) => host === h || host.endsWith(`.${h}`))
    ) ?? null
  );
}

export function isOutboundPartnerLink(href: string): boolean {
  return matchOutboundPartner(href) !== null;
}
