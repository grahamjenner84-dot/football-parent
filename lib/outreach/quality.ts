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

// Commercial rivals: apps, club software and paid trials/academy services
// that compete with the Coach App or sell to the same parents. A business
// won't link to a rival product. Rejected.
const COMPETITOR_HOSTS = [
  "teamstats.net",
  "teamgrassroots.co.uk",
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

// Content peers: independent parent/grassroots content sites that rank for
// the same keywords. Not rejected (Graham, Sept 2026): a one-person content
// site has no product to protect and is often happy to link to good,
// relevant content, especially as a mutual. Flagged so the pitch is framed
// as peers helping each other, not as a cold request.
export function isCommercialRival(host: string): boolean {
  return hostMatches(host, COMPETITOR_HOSTS);
}

export const CONTENT_PEER_HOSTS = ["juniorgrassrootshub.com", "grassrootsfootballuk.com", "thefootballparent.co.uk"];

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
  "trustburn.com",
];
// Club admin pages: policies, handbooks, codes of conduct, ethos and
// philosophy pages, committee lists. They state the club's own rules and are
// not written to send readers anywhere else, so "link to our article" has no
// natural home on them. The first backlog run was mostly these (Sept 2026).
// Kept conservative on purpose: a coach's blog post on "my coaching
// philosophy" is exactly what we want, so only club-flavoured slugs count,
// and anything under a blog/news path is left to the page-content check.
const CLUB_ADMIN_PAGE = /(polic(y|ies)|code-?of-?conduct|constitution|handbook|welcome-?pack|club-?rules|rules-and-regulations|safeguarding|club-?ethos|our-?ethos|club-?philosophy|playing-?philosophy|the-player-journey|club-?documents|committee|club-?officials|join-?us|registration|membership|kit-?list|managing-a-.*-team)/i;
const EDITORIAL_PATH = /\/(blog|news|articles?|insights|posts?|stories|opinion|features?)\//i;
const CLUB_ADMIN_TITLE = /\b(policy|policies|code of conduct|constitution|handbook|welcome pack|club rules|safeguarding|our ethos|club ethos|playing philosophy|committee|club officials)\b/i;

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
    // Club foundations and community trusts: stfcfoundation, brentfordfccst,
    // pompeyitc, bfcct. Not footballfoundation.org.uk (no "fc").
    /^[a-z0-9-]*(fc[a-z0-9-]*(foundation|trust|cst|cct)|(cst|ccst|cct|itc))$/i.test(host.split(".")[0]) ||
    /\b(jfc|youth fc|junior football club|youth football club|community football club)\b/i.test(text)
  )
    return "club";
  if (/\/(blog|news|articles?|insights|the-[a-z-]+)\//i.test(url.pathname)) return "blog";
  if (/\b(resources?|useful links|links|parents?)\b/i.test(url.pathname.replace(/[/-]/g, " "))) return "resource";
  return "other";
}

// Link farms and scraped copies. Backlink data for any page we look at is
// full of them: "natural-seo-backlinks" directories on .link/.online domains,
// escort pages on numbered .xyz hosts, wiki mirrors. The Sept 2026 link-graph
// run passed all of these as "ok". Nobody wrote them, so there is no one to
// pitch and a link from them would hurt.
const SPAM_TLDS = [".xyz", ".top", ".online", ".site", ".website", ".click", ".link", ".icu", ".cyou", ".cfd", ".sbs", ".buzz", ".rest", ".monster", ".wiki"];
const SPAM_HOST = /escort|casino|porn|viagra|payday|betting|backlink|linklegion|link-legion|seo-?anomaly|dapa|domainauthority|domain-authority|wholinks|\bseo\b|seo(biz|global|tools|link)/i;
const SPAM_PATH = /escort|casino|natural-seo-backlinks|seo-anomaly|backlinks?-checker/i;
const MIRROR_HOSTS = ["wikiwand.com", "grokipedia.com", "wikisort.org", "dewiki.one", "profilpelajar.com", "twitt-stats.com", "poddtoppen.se", "ivy.fm", "podimo.com"];

export function isSpamHost(host: string): boolean {
  return SPAM_TLDS.some((t) => host.endsWith(t)) || SPAM_HOST.test(host.replace(/\./g, " "));
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
  if (isSpamHost(host) || SPAM_PATH.test(u.pathname)) return reject("link farm or spam domain: nobody wrote this page");
  if (hostMatches(host, MIRROR_HOSTS)) return reject("wiki mirror, scraper or podcast directory: a copy of someone else's page, nobody to pitch");
  if (hostMatches(host, COMPETITOR_HOSTS)) return reject("commercial rival (app, club software or paid service): will not link to a rival product");
  if (hostMatches(host, CONTENT_PEER_HOSTS)) reasons.push("content site ranking for our keywords: may see us as a rival, so pitch as a mutual");
  if (hostMatches(host, DEAD_END_HOSTS) || FORUM_PATH.test(u.pathname)) return reject("platform/forum/marketplace: nobody to pitch");

  const lowerPath = u.pathname.toLowerCase();
  if (FILE_EXTENSIONS.test(u.pathname) || FILE_PATH_MARKERS.some((m) => lowerPath.includes(m)) || FILE_HOST_MARKERS.some((m) => host.includes(m))) {
    const clubHint = type === "club" && isUk !== false ? " (the club's own site may still be worth a look)" : "";
    return reject(`file download (PDF/doc/CDN), not an editable web page${clubHint}`);
  }
  if (ARCHIVE_PATH.test(u.pathname)) return reject("archive/author/tag listing page, not an article");
  if (!EDITORIAL_PATH.test(u.pathname) && (CLUB_ADMIN_PAGE.test(u.pathname) || CLUB_ADMIN_TITLE.test(c.title ?? ""))) {
    return reject("club policy/admin page: states their own rules, not written to send readers elsewhere");
  }
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

// ---------------------------------------------------------------------------
// Page-content check, run once the page has actually been read
// (scripts/outreach/research.ts read). The URL gate above can't see what a
// page says or links to; this can.
//
// What we want is people writing about a topic: an opinion piece, advice
// article or explainer that already cites independent sources, so "here's
// another good read on this" is a natural ask. What we don't want is a page
// whose only outbound links are the FA, the league and social media: it has
// shown it doesn't point readers to independent resources, whatever the
// topic.

export interface PageContent {
  url: string;
  title: string | null;
  headings: string[];
  text: string;
  wordCount: number;
  externalLinks: { url: string; anchor: string }[];
}

export interface PageContentResult {
  verdict: "ok" | "rejected";
  kind: "article" | "resource_list" | "other";
  reasons: string[];
  independentLinks: { url: string; anchor: string }[];
}

// Outbound links that say nothing about willingness to cite a third party:
// governing bodies, leagues, fixtures/club-admin platforms, social media,
// app stores, payment and booking tools.
const INSTITUTIONAL_HOSTS = [
  ...GOVERNING_BODY_HOSTS,
  "fulltime.thefa.com",
  "wholegame.thefa.com",
  "pitchero.com",
  "teamstats.net",
  "spond.com",
  "clubbuzz.co.uk",
  "teamapp.com",
  "sportlomo.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "whatsapp.com",
  "apple.com",
  "play.google.com",
  "google.com",
  "maps.google.com",
  "paypal.com",
  "gocardless.com",
  "eventbrite.co.uk",
  "eventbrite.com",
  "justgiving.com",
  "wix.com",
  "wordpress.org",
  "clubsite.co.uk",
];

export function isInstitutionalLink(link: { url: string; anchor: string }): boolean {
  const host = hostOf(link.url);
  if (!host) return true;
  // Grassroots leagues rarely say "league" in their domain: hdjfl.co.uk,
  // svyfl.org.uk, jpl, ...dfl, ...yl.
  const leagueHost = /league/i.test(host) || /^([a-z0-9-]+\.)?[a-z0-9-]*(jfl|yfl|jyfl|dfl|ydfl|jpl|ysl|yl|fl)\.(co\.uk|org\.uk|org|com|uk)$/i.test(host);
  if (hostMatches(host, INSTITUTIONAL_HOSTS) || COUNTY_FA_PATTERN.test(host) || leagueHost) return true;
  return /\b(sponsor|sponsored by|partner|kit supplier|powered by|website by|designed by)\b/i.test(link.anchor);
}

// Site furniture: links that sit on the page whoever wrote it and say nothing
// about whether the writer cites other people's work. In the Sept 2026 run
// these carried most of the pages that passed: a "Website built by Jamie
// Clarke" footer credit, Akismet's comment notice, Pinterest follow buttons,
// amzn.to and Awin affiliate links, an energy-switch referral, "Ask ChatGPT"
// summary buttons, cookie widgets, Microsoft Forms sign-ups, and the jobs,
// notices and bingo links every regional newspaper page carries.
const NON_EDITORIAL_HOSTS = [
  // blog plumbing and credits
  "akismet.com", "gravatar.com", "jetpack.com", "wordpress.com", "pinterest.com", "flickr.com", "unsplash.com", "pexels.com", "shutterstock.com",
  "cookiedatabase.org", "cookiebot.com", "onetrust.com", "hs-sites.com",
  // forms, tickets, booking
  "forms.office.com", "forms.cloud.microsoft", "forms.gle", "typeform.com", "jotform.com", "tixr.com", "square.site", "raffall.com", "mixlr.com", "bookpebble.co.uk",
  // shorteners: the destination can't be judged, so they prove nothing
  "bit.ly", "t.co", "tinyurl.com", "ow.ly", "goo.gl", "maps.app.goo.gl", "linktr.ee",
  // affiliate and referral
  "amzn.to", "amazon.co.uk", "amazon.com", "awin1.com", "awin.com", "skimresources.com", "redirectingat.com", "linksynergy.com", "shareasale.com", "anrdoezrs.net", "prf.hn", "tidd.ly", "rstyle.me", "share.octopus.energy",
  // "summarise this page" buttons
  "chatgpt.com", "claude.ai", "grok.com", "perplexity.ai",
  // regional newspaper network furniture
  "inyourarea.co.uk", "newspapersubs.co.uk", "funeral-notices.co.uk", "publicnoticeportal.uk", "bookanad.com", "reachplc.com", "trinitymirror.com", "mirrorbingo.com", "mirrorpix.com", "reachphotosales.co.uk", "jobstoday.co.uk", "nationalworld.com", "connect-local.co.uk", "newsprints.co.uk", "yimbly.com",
];
// Staging and hosting subdomains: a link to a half-migrated copy of the site
// itself, not a citation.
const STAGING_HOST = /(\.sg-host\.com|\.stackstaging\.com|\.temp\.link|\.wpengine(powered)?\.com|\.wpcomstaging\.com|\.netlify\.app|\.vercel\.app|\.herokuapp\.com)$/i;
const AFFILIATE_PARAM = /[?&](tag|awinaffid|affid|aff_id|irclickid|clickref)=/i;
const CREDIT_ANCHOR = /\b(site|website|web site)\b[\w\s&,]{0,30}?\bby\b|\b(designed|developed|built|hosted|made) by\b|\bweb ?design\b|\btheme by\b|^pingback:|comment data is processed|\bview \S+ profile on\b|all rights reserved|©|\bask (chatgpt|claude|grok|perplexity)\b/i;
const FURNITURE_ANCHOR = /^(jobs?|notices|funeral notices|public notices|family notices|subscribe|subscriptions?|advertis(e|ing)( with us)?|place an ad|photo sales|buy (a )?photos?|bingo|dating|puzzles|competitions|tickets?|shop|newsletters?|cookie (policy|settings|preferences)|privacy( policy)?|terms( (and|&) conditions)?|contact us|log ?in|sign ?up|book now|parent login|school login)$/i;

// Unmoderated comment spam: a page carrying these is on a site nobody is
// looking after (acoachesview.com's "taboo series" post had 39 of them).
const SPAM_ANCHOR = /\b(rehab|detox|escorts?|casino|slots|betting|bet365|poker|payday|loans?|viagra|cialis|cbd|vape|crypto|forex|porn|xxx|plombier|locksmith|seo services|backlinks?|mental health treatment|treatment (center|facility))\b/i;

export function isSpamLink(link: { url: string; anchor: string }): boolean {
  return SPAM_ANCHOR.test(link.anchor) || isSpamHost(hostOf(link.url));
}

// The site's own name, ignoring subdomains and the public suffix:
// bookings.activeme360.co.uk -> activeme360, laceeze.com -> laceeze.
function siteLabel(host: string): string {
  const parts = host.split(".");
  const suffixLen = /\.(co|org|me|ac|gov|net|ltd|plc|sch)\.uk$/.test(host) ? 3 : 2;
  return parts.length >= suffixLen ? parts[parts.length - suffixLen] : parts[0];
}

// A link to the site's own shop, booking system, course platform or sister
// domain (bookings.activeme360.co.uk, coachkurtis.gr8.com, laceeze.com from
// laceeze.co.uk) is not a citation of someone else.
function isOwnSiteLink(linkHost: string, pageHost: string): boolean {
  if (!pageHost) return false;
  const label = siteLabel(pageHost);
  return siteLabel(linkHost) === label || (label.length >= 6 && linkHost.includes(label));
}

export function isNonEditorialLink(link: { url: string; anchor: string }, pageHost = ""): boolean {
  const host = hostOf(link.url);
  if (!host) return true;
  if (hostMatches(host, NON_EDITORIAL_HOSTS) || STAGING_HOST.test(host) || AFFILIATE_PARAM.test(link.url)) return true;
  if (isOwnSiteLink(host, pageHost)) return true;
  const anchor = link.anchor.trim();
  return CREDIT_ANCHOR.test(anchor) || FURNITURE_ANCHOR.test(anchor);
}

// What's left once governing bodies, social media, site furniture, the site's
// own properties and spam are taken out: links that show the writer points
// readers at other people's work.
export function editorialLinks(page: Pick<PageContent, "url" | "externalLinks">): { url: string; anchor: string }[] {
  const pageHost = hostOf(page.url);
  return page.externalLinks.filter((l) => !isInstitutionalLink(l) && !isNonEditorialLink(l, pageHost) && !isSpamLink(l));
}

const BYLINE = /\b(by|written by|author|posted by|words by)[:\s]+[A-Z][a-z]+(\s[A-Z][a-z]+)?/;
const DATE_TEXT = /\b(\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/i;
const FIRST_PERSON = /\b(I think|I believe|in my (view|opinion|experience)|as a (parent|coach|dad|mum)|we've found|my (son|daughter|child|kids))\b/i;
const RESOURCE_LIST = /\b(useful links|resources|further reading|recommended reading|reading list|helpful links|links for parents|parent resources)\b/i;

export function assessPageContent(page: PageContent): PageContentResult {
  const reasons: string[] = [];
  const independentLinks = editorialLinks(page);
  const reject = (why: string, kind: PageContentResult["kind"] = "other"): PageContentResult => ({ verdict: "rejected", kind, reasons: [...reasons, why], independentLinks });

  const titleAndHeadings = [page.title ?? "", ...page.headings].join(" | ");
  if (CLUB_ADMIN_TITLE.test(titleAndHeadings.split(" | ").slice(0, 3).join(" "))) {
    return reject("club policy/admin page: states their own rules, not written to send readers elsewhere");
  }
  if (page.externalLinks.length === 0) return reject("doesn't link to any other site");
  const spam = page.externalLinks.filter(isSpamLink);
  if (spam.length >= 3) {
    return reject(`carries link spam (${spam.length} links such as "${spam[0].anchor.slice(0, 40)}"), usually unmoderated comments: the site isn't being looked after`);
  }
  if (independentLinks.length === 0) {
    return reject(
      `only links to FA, league, social or admin sites, or site furniture (credits, affiliate links, plugins, its own shop) (${page.externalLinks.length} links, none to independent articles or resources)`
    );
  }

  const head = page.text.slice(0, 800);
  const signals = [BYLINE.test(head) && "byline", DATE_TEXT.test(page.text.slice(0, 1500)) && "dated", FIRST_PERSON.test(page.text) && "first-person"].filter(Boolean) as string[];
  const isArticle = page.wordCount >= 350 && signals.length > 0;
  const isResourceList = RESOURCE_LIST.test(titleAndHeadings) && independentLinks.length >= 3;

  if (isArticle) {
    reasons.push(`article (${signals.join(", ")}; ${page.wordCount} words; ${independentLinks.length} independent outbound link${independentLinks.length === 1 ? "" : "s"})`);
    return { verdict: "ok", kind: "article", reasons, independentLinks };
  }
  if (isResourceList) {
    reasons.push(`curated resource list with ${independentLinks.length} independent links`);
    return { verdict: "ok", kind: "resource_list", reasons, independentLinks };
  }
  return reject(
    page.wordCount < 350
      ? `too thin to be an article (${page.wordCount} words) and not a resource list with independent links`
      : "no author, date or first-person voice, and not a resource list with independent links: reads like a site page, not something someone wrote"
  );
}
