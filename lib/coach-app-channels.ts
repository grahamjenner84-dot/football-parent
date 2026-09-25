import { classifyReferrerHost, type SourceGroup } from "@/lib/referrer-sources";

// One definition of "channel" for the Coach App funnel, applied the same way
// to visits (page_views rows) and to sign-ups (coach_app_signups rows), so
// the two columns of the funnel table count like with like.
//
// Order matters: the first rule that matches wins.
//  1. Google Ads      - a gclid, or a paid utm_medium. Ads beat everything:
//                       an ad click that then used a banner still cost money.
//  2. Shared link     - utm_source=parent-share, the link the share banner's
//                       "Send it to your child's coach" button sends.
//  3. Article banner  - arrived through a Coach App banner in an article
//                       (?b= param). Whatever brought them to the article,
//                       usually Google, the article did the persuading.
//  4. Search          - the visit began from a search engine, no banner.
//  5. Site link       - moved from another page of ours, no banner (header
//                       menu, an in-article link).
//  6. Direct          - no referrer at all.
//  7. Other           - AI assistants, social, any other site.
//  8. Unknown         - sign-ups only: the coach declined analytics cookies,
//                       so nothing about their visit was kept.
//
// "Began from" is honest for visits because Next's client-side navigation
// never updates document.referrer: a reader who lands on an article from
// Google and clicks through to the Coach App page still reports google.com.
export const COACH_APP_CHANNELS = [
  "Google Ads",
  "Shared link",
  "Article banner",
  "Search",
  "Site link",
  "Direct",
  "Other",
  "Unknown",
] as const;
export type CoachAppChannel = (typeof COACH_APP_CHANNELS)[number];

export const SHARED_LINK_UTM_SOURCE = "parent-share";

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-social", "paidsocial"]);

export interface ChannelInputs {
  hasGclid: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  banner: string | null;
  /** The visit's source group, as lib/referrer-sources.ts classifies it. */
  sourceGroup: SourceGroup | string | null;
  /** False only for a sign-up that arrived with no attribution at all. */
  attributed?: boolean;
}

export function channelFor(input: ChannelInputs): CoachAppChannel {
  if (input.attributed === false) return "Unknown";
  if (input.hasGclid || input.sourceGroup === "Ads") return "Google Ads";
  if (input.utmMedium && PAID_MEDIUMS.has(input.utmMedium.toLowerCase())) return "Google Ads";
  if (input.utmSource === SHARED_LINK_UTM_SOURCE) return "Shared link";
  if (input.banner) return "Article banner";
  switch (input.sourceGroup) {
    case "Search":
      return "Search";
    case "Internal":
      return "Site link";
    case "Direct":
    case null:
      return "Direct";
    default:
      return "Other";
  }
}

/** A page_views row's channel. */
export function channelForPageView(row: {
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  gclid: string | null;
  banner_variant: string | null;
}): CoachAppChannel {
  return channelFor({
    hasGclid: Boolean(row.gclid),
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    banner: row.banner_variant,
    sourceGroup: classifyReferrerHost(row.referrer_host).group,
  });
}
