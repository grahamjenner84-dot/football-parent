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
//
// Deliberately NOT "noreferrer": Amazon Associates needs to see the referrer
// to confirm the traffic source is our registered site (their compliance
// review flags "unable to determine the source of traffic" otherwise, even
// while sales still attribute off the ?tag= in the URL). "noopener" alone
// keeps the tab-nabbing protection without stripping the Referer header, so
// the browser still sends our origin to Amazon on the click.
export function affiliateLinkProps(href: string) {
  return isAffiliateLink(href)
    ? { rel: "sponsored nofollow noopener", target: "_blank" }
    : {};
}
