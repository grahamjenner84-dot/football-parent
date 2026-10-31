// Hosts whose links are monetised. Links to these get rel="sponsored nofollow"
// so search engines don't read them as editorial endorsements, which both
// Google's link-qualifier guidance and the Amazon Associates terms require.
//
// Shared between the MDX link renderer (for inline links written as ordinary
// markdown) and GearPicks (which renders its own anchors), so a link can't end
// up untagged just because of which component happened to render it.
// QuickPlay Sport links go through Awin (from 31 Oct 2026): QUICKPLAY UK is
// Awin advertiser 72387, Football Parent is publisher 3063761, and Awin gives
// a 30-day cookie where the old direct "?ref=footballparent" link only set a
// session cookie. Author every QuickPlay link as a full Awin deep link:
//   https://www.awin1.com/cread.php?awinmid=72387&awinaffid=3063761&ued=<encodeURIComponent(product url)>
// never an Awin short link (tidd.ly), for the same reason as amzn.to: the
// tracking ids belong visibly in the page source. quickplaysport.com stays in
// the list so any direct link left behind still gets rel="sponsored".
export const AFFILIATE_HOSTS = ["amzn.to", "amazon.co.uk", "amazon.com", "quickplaysport.com", "awin1.com"];

const AWIN_HOSTS = ["awin1.com"];

// The merchant URL an affiliate link actually lands on. For an Awin deep link
// that is the `ued` parameter; anything else is returned unchanged. Used by
// click reporting so an Awin link reports as the retailer and product it
// points at, not as one "awin1.com/cread.php" row for every product.
export function affiliateDestination(href: string): string {
  try {
    const u = new URL(href);
    const host = u.hostname.toLowerCase();
    if (AWIN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      const ued = u.searchParams.get("ued");
      if (ued) return new URL(ued).toString();
    }
  } catch {
    // fall through
  }
  return href;
}

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
