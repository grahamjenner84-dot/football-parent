// Hosts we link to for comparison/citation purposes but don't want to pass
// link equity to, because they're direct competitors rather than sources or
// partners. Separate from lib/affiliate.ts (commercial/Associates-driven
// nofollow) since the reason here is competitive, not monetisation.
export const COMPETITOR_HOSTS = [
  "spond.com",
  "teamstats.net",
  "pitchero.com",
];

export function isCompetitorLink(href: string): boolean {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return false;
  }
  return COMPETITOR_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function competitorLinkProps(href: string) {
  return isCompetitorLink(href)
    ? { rel: "nofollow noopener noreferrer", target: "_blank" }
    : {};
}
