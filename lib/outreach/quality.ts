// Hard quality gate for link-building prospects.
//
// Every prospect passes through here before it can reach the weekly outreach
// queue, whether it came from an old CSV export, the weekly discovery run or
// a manual add. The rules are deliberately blunt and deterministic: the
// earlier prospect lists were full of things no amount of good copy would
// turn into a link (PDF policy documents, US soccer clubs, county FA pages,
// sitewide homepage links that were really paid partnerships), and Graham
// was the one filtering them out by hand. Anything these rules can catch
// cheaply, they catch here.
//
// Three outcomes:
//   - ok:      editorial page we can realistically pitch -> backlog
//   - parked:  real relationship, wrong channel for a cold email (governing
//              bodies, homepage/partner links, national press) -> kept visible
//              under "Parked" so a business conversation can pick it up
//   - rejected: never worth an email -> stored so discovery never re-adds it
//
// Pure functions only: no network, no Supabase. Safe to import anywhere.

export type ProspectType =
  | "club"
  | "league"
  | "blog"
  | "resource"
  | "media"
  | "business"
  | "expert"
  | "governing_body"
  | "other";

export type Verdict = "ok" | "parked" | "rejected";

export interface ProspectCandidate {
  url: string;
  title?: string | null;
  // Free-text country from a research export ("UK", "US", "other/unclear").
  country?: string | null;
  // Any extra text the source gave us (topic, notes, why it fits).
  context?: string | null;
}

export interface QualityResult {
  verdict: Verdict;
  reasons: string[];
  type: ProspectType;
  domain: string;
  isUk: boolean | null;
}

export const OUR_DOMAIN = "footballparent.co.uk";

// File downloads. A PDF or .ashx policy document has no editor, no page to
// add a link to, and usually no contact; the club's own site might, but that
// is a different prospect.
const FILE_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|ashx|odt|rtf|txt|csv|zip|jpe?g|png)(\?|#|$)/i;
const FILE_PATH_MARKERS = [
  "/wp-content/uploads/",
  "/-/media/",
  "/attachments/",
  "/fileuploads/",
  "/files/",
  "/docs/",
  "/download/",
];
const FILE_HOST_MARKERS = ["cdn", "azurefd.net", "cloudfront.net", "rampinteractive.com", "amazonaws.com", "googleusercontent.com"];

// Governing bodies link to partners and sponsors, not independent parent
// sites: TeamStats' county FA links come from hosting their leagues, not from
// anyone pitching an article. Parked, not rejected, so a partnership
// conversation stays possible.
const GOVERNING_BODY_HOSTS = [
  "thefa.com",
  "englandfootball.com",
  "scottishfa.co.uk",
  "faw.cymru",
  "irishfa.com",
  "fai.ie",
  "uefa.com",
  "fifa.com",
  "premierleague.com",
  "efl.com",
];
// County FAs: berks-bucksfa.com, sheffieldfa.freshdesk.com, scottishyouthfa.co.uk, aberdeenshireafa.com...
const COUNTY_FA_PATTERN = /(^|\.)[a-z-]*(county)?a?fa\.(com|co\.uk|org\.uk|org)$|(^|\.)[a-z-]+fa\.freshdesk\.com$/i;

// Coaching/club-admin apps that compete with the Coach App or with us for the
// same parent audience. They will not link to a rival.
const COMPETITOR_HOSTS = [
  "teamstats.net",
  "teamgrassroots.co.uk",
  "juniorgrassrootshub.com",
  "grassrootsfootballuk.com",
  "mycoachfootball.com",
  "mingle.sport",
  "spond.com",
  "classforkids.com",
  "classforkids.io",
  "clubhubuk.co.uk",
  "loveadmin.com",
  "pitchero.com",
  "teamapp.com",
  "squadd.co.uk",
  "heja.io",
  "teamsnap.com",
  "playingtimecalculator.com",
  "wemakefootballers.com",
  "ukfootballtrials.com",
  "soccertrials.com",
];

// Platforms where there is nobody to email about a link, or the link would be
// worthless (UGC, forums, marketplaces, big brands).
const DEAD_END_HOSTS = [
  "facebook.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "reddit.com",
  "pinterest.com",
  "quora.com",
  "amazon.co.uk",
  "amazon.com",
  "ebay.co.uk",
  "wikipedia.org",
  "microsoft.com",
  "underarmour.com",
  "nike.com",
  "adidas.co.uk",
  "podbean.com",
  "wordpress.com",
  "blogspot.com",
  "medium.com",
  "trustburn.com",
];
const FORUM_PATH = /\/(threads?|forum|forums|topic|community\/t)\//i;

// Archive/listing pages (author, tag, paged category archives): nothing on
// them is an article anyone would edit to add a link.
const ARCHIVE_PATH = /\/(author|tag|tags|category)\/|\/page\/\d+\/?$/i;

// Shop product pages: a retailer isn't going to add an editorial link to a
// product listing.
const PRODUCT_PATH = /\/(products?|shop|basket|cart)\//i;

// A directory or startup-listing page about a competitor (footyapps.com's
// TeamStats listing, sportstartups.org's Mingle page) is not a pitch, it's a
// sign-up form: the ask is "list the Coach App too".
const COMPETITOR_SLUGS = /teamstats|minglesport|mingle-sport|teamgrassroots|mycoach|spond|pitchero|squadd|heja|teamsnap/i;

// National broadcasters and newspapers do link out, but only off the back of
// a press angle (a data story, a quote request), never a cold "please link
// my article". Parked for the journalist-request workflow instead.
const MEDIA_HOSTS = ["bbc.co.uk", "rte.ie", "theguardian.com", "telegraph.co.uk", "independent.co.uk", "thetimes.co.uk", "dailymail.co.uk", "mirror.co.uk", "skysports.com"];

// A Coach App or parent-guide link from a rugby or netball club is not
// happening, however good the pitch. General "youth sports" pages are only
// allowed through if they are clearly about football too.
const OTHER_SPORTS = /\b(rugby|netball|basketball|hockey|cricket|baseball|softball|lacrosse|volleyball|swimming|gymnastics|tennis|golf|handball|nfl|american football|little league)\b/i;
const FOOTBALL_SIGNAL = /\b(football|footy|soccer|futsal|fc|jfc|afc|u\d{1,2}s?|grassroots)\b/i;
const GENERIC_SPORTS = /\b(youth[\s-]sports?|kids'?[\s-]sports?|children'?s[\s-]sport)\b/i;

// US soccer vocabulary: "soccer" alone isn't disqualifying (UK soccer schools
// exist) but these are.
const US_SIGNALS = /\b(ymca|recreational soccer|club soccer|travel soccer|rec league|middle school|high school|varsity)\b/i;

// Place names that settle the country when the domain doesn't (a .com club
// site in Perth, WA got through the first run). Deliberately excludes names
// that are also UK places (Perth, Victoria, Wellington, Richmond...).
const NON_UK_SIGNALS = /\b(australia|australian|new south wales|nsw|queensland|western australia|south australia|tasmania|new zealand|canada|canadian|ontario|british columbia|alberta|usa|united states|u\.s\. soccer|us youth soccer|south africa)\b/i;

const NON_UK_TLDS = [".ca", ".com.au", ".au", ".us", ".co.nz", ".nz", ".ie", ".za", ".in", ".de", ".nl", ".fr", ".es"];
const UK_TLDS = [".co.uk", ".org.uk", ".uk", ".scot", ".wales", ".cymru"];

export function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostMatches(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

function isHomepage(u: URL): boolean {
  const path = u.pathname.replace(/\/+$/, "");
  return path === "" || /^\/(index\.(html?|php)|home)$/i.test(path);
}

export function inferUk(host: string, country?: string | null): boolean | null {
  const c = (country ?? "").trim().toLowerCase();
  if (c) {
    if (["uk", "united kingdom", "england", "scotland", "wales", "northern ireland", "gb"].includes(c)) return true;
    if (!c.includes("unclear") && !c.includes("other")) return false;
  }
  if (UK_TLDS.some((t) => host.endsWith(t))) return true;
  if (NON_UK_TLDS.some((t) => host.endsWith(t))) return false;
  return null;
}

export function classifyType(host: string, url: URL, text: string): ProspectType {
  if (hostMatches(host, GOVERNING_BODY_HOSTS) || COUNTY_FA_PATTERN.test(host)) return "governing_body";
  if (hostMatches(host, MEDIA_HOSTS)) return "media";
  if (COMPETITOR_SLUGS.test(url.pathname)) return "business";
  if (/league/i.test(host)) return "league";
  if (
    /(jfc|afc|fc|juniors|youth|united|rovers|athletic|colts|communityfootball)\b/i.test(host.replace(/[.-]/g, " ")) ||
    /\b(jfc|youth fc|junior football club|youth football club|community football club)\b/i.test(text)
  )
    return "club";
  if (/\/(blog|news|articles?|insights|the-[a-z-]+)\//i.test(url.pathname)) return "blog";
  if (/\b(resources?|useful links|links|parents?)\b/i.test(url.pathname.replace(/[/-]/g, " "))) return "resource";
  return "other";
}

export function assessProspect(c: ProspectCandidate): QualityResult {
  const reasons: string[] = [];
  let u: URL;
  try {
    u = new URL(c.url);
  } catch {
    return { verdict: "rejected", reasons: ["not a valid URL"], type: "other", domain: "", isUk: null };
  }
  const host = hostOf(c.url);
  const text = [c.url, c.title ?? "", c.context ?? ""].join(" ");
  const type = classifyType(host, u, text);
  const isUk = inferUk(host, c.country);

  const reject = (why: string): QualityResult => ({ verdict: "rejected", reasons: [...reasons, why], type, domain: host, isUk });
  const park = (why: string): QualityResult => ({ verdict: "parked", reasons: [...reasons, why], type, domain: host, isUk });

  if (host === OUR_DOMAIN || host.endsWith(`.${OUR_DOMAIN}`)) return reject("our own site");
  if (hostMatches(host, COMPETITOR_HOSTS)) return reject("competitor app/site: will not link to a rival");
  if (hostMatches(host, DEAD_END_HOSTS) || FORUM_PATH.test(u.pathname)) return reject("platform/forum/marketplace: nobody to pitch");

  const lowerPath = u.pathname.toLowerCase();
  if (FILE_EXTENSIONS.test(u.pathname) || FILE_PATH_MARKERS.some((m) => lowerPath.includes(m)) || FILE_HOST_MARKERS.some((m) => host.includes(m))) {
    const clubHint = type === "club" && isUk !== false ? " (the club's own site may still be worth a look)" : "";
    return reject(`file download (PDF/doc/CDN), not an editable web page${clubHint}`);
  }
  if (ARCHIVE_PATH.test(u.pathname)) return reject("archive/author/tag listing page, not an article");
  if (type === "business" && COMPETITOR_SLUGS.test(u.pathname)) {
    reasons.push("competitor listing on a directory: ask to list the Coach App too, not for an article link");
  } else if (PRODUCT_PATH.test(u.pathname)) {
    return reject("shop product page");
  }

  // Another sport in the page's own address or title is decisive. In the
  // surrounding context it isn't: a girls' coaching guide that mentions
  // "Women in Sport" or netball crossover was wrongly rejected in the first
  // run, so that only earns a check-it note.
  const ownText = [c.url, c.title ?? ""].join(" ");
  if (OTHER_SPORTS.test(ownText) && !FOOTBALL_SIGNAL.test(text)) return reject("about another sport, not football");
  if (OTHER_SPORTS.test(text) && !FOOTBALL_SIGNAL.test(text)) reasons.push("mentions another sport: check the page is about football");
  if (GENERIC_SPORTS.test(text) && !FOOTBALL_SIGNAL.test(text)) return reject("general youth-sports page with no football angle");

  if (isUk === false) return reject(`outside the UK (${c.country?.trim() || host})`);
  if (isUk === null && US_SIGNALS.test(text)) return reject("US youth-soccer page");
  if (isUk === null && NON_UK_SIGNALS.test(text)) return reject(`outside the UK (${text.match(NON_UK_SIGNALS)![0]})`);

  if (type === "governing_body") return park("governing body: links go to partners and sponsors, so this needs a partnership, not a cold pitch");
  if (type === "media") return park("national media: needs a press angle or journalist request, not a link request");
  if (/\/(partners?|sponsors?|our-sponsors|supporters)(\/|$)/i.test(u.pathname) || /-partners\/?$/i.test(u.pathname)) {
    return park("partners/sponsors page: a commercial relationship, not an editorial link");
  }
  if (isHomepage(u)) return park("homepage-level link: usually a sitewide partner/sponsor/directory link, i.e. a business relationship");

  if (isUk === null) reasons.push("country unclear from URL");
  return { verdict: "ok", reasons, type, domain: host, isUk };
}
