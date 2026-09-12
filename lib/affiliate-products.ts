import { getAllArticles } from "@/lib/content";
import { isAffiliateLink } from "@/lib/affiliate";

// The affiliate click log stores the anchor's own text as link_text. For an
// ordinary inline link that is the product name as the reader saw it, but for
// a GearPicks button it is the shared call-to-action ("View on Amazon") on
// every single product - so the "By product" table ends up listing "View on
// Amazon" over and over with no idea what was actually clicked. The product
// names only ever live in the MDX (the GearPicks `name` field, or the inline
// anchor text), never in the Amazon URL itself, which is just an ASIN or an
// amzn.to short link. This rebuilds the href -> name map from the content so
// the report can label each destination with what it actually is, for both
// historical rows and future clicks.

// Strips the tracking query (?tag=), www. and any trailing slash so the href
// logged at click time (the resolved absolute URL) and the href written in the
// MDX collapse to the same key. Applied identically to both sides.
export function normalizeAffiliateHref(href: string): string {
  try {
    const u = new URL(href);
    return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return href.trim().toLowerCase();
  }
}

// Pairs of "name":"...","href":"..." as GearPicks authors them (name always
// immediately precedes href in the item objects). Matched directly rather than
// by parsing whole GearPicks JSON blocks, so an apostrophe in a note can't
// break the outer single-quoted data= attribute parse.
const GEAR_PICK_PAIR = /"name"\s*:\s*"([^"]+)"\s*,\s*"href"\s*:\s*"([^"]+)"/g;
// Ordinary markdown links [anchor](href) - the fallback source of a name for
// products that only ever appear as an inline link, never in a GearPicks block.
const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

let cached: Map<string, string> | null = null;

// href (normalized) -> best product name found in the content. GearPicks names
// win over inline anchor text when a product appears in both. Built once per
// process; the content is static per deploy.
export function getAffiliateProductNames(): Map<string, string> {
  if (cached) return cached;

  const map = new Map<string, string>();
  const articles = getAllArticles();

  // GearPicks first, so their explicit product names take precedence.
  for (const article of articles) {
    for (const m of article.content.matchAll(GEAR_PICK_PAIR)) {
      const name = m[1].trim();
      const href = m[2].trim();
      if (name && isAffiliateLink(href)) {
        map.set(normalizeAffiliateHref(href), name);
      }
    }
  }

  // Inline links fill gaps only - never overwrite a GearPicks name.
  for (const article of articles) {
    for (const m of article.content.matchAll(MARKDOWN_LINK)) {
      const anchor = m[1].trim();
      const href = m[2].trim();
      if (!anchor || !isAffiliateLink(href)) continue;
      const key = normalizeAffiliateHref(href);
      if (!map.has(key)) map.set(key, anchor);
    }
  }

  cached = map;
  return map;
}
