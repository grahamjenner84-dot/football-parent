// Hosts whose links are monetised. Links to these get rel="sponsored nofollow"
// so search engines don't read them as editorial endorsements, which both
// Google's link-qualifier guidance and the Amazon Associates terms require.
//
// Shared between the MDX link renderer (for inline links written as ordinary
// markdown) and GearPicks (which renders its own anchors), so a link can't end
// up untagged just because of which component happened to render it.
export const AFFILIATE_HOSTS = ["amzn.to", "amazon.co.uk", "amazon.com"];

export function isAffiliateLink(href: string): boolean {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return false;
  }
  return AFFILIATE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

// Attributes to spread onto an anchor. Non-affiliate links get nothing, so
// ordinary citation links keep rendering exactly as they always have.
export function affiliateLinkProps(href: string) {
  return isAffiliateLink(href)
    ? { rel: "sponsored nofollow noopener noreferrer", target: "_blank" }
    : {};
}
