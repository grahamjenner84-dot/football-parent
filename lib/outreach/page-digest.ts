// Turns a DataForSEO content_parsing result into a compact digest of a
// prospect page: its headings, main text, outbound links and any contact
// details, which is what the outreach research needs to judge fit and find
// someone to email.
//
// The parser walks the result generically rather than hard-coding one
// response shape: it collects every `text`/`h_title` string and every
// `url`/`urls[]` link it finds. That keeps it working if DataForSEO adds or
// renames a section, at the cost of occasionally including footer text.
//
// Pure: no network. The page text is untrusted third-party content and is
// only ever treated as data to assess, never as instructions.

import { hostOf, OUR_DOMAIN } from "./quality";

export interface PageLink {
  url: string;
  anchor: string;
}

export interface PageDigest {
  url: string;
  ok: boolean;
  // Why ok is false (fetch failed, blocked, empty) - never guessed around.
  problem: string | null;
  title: string | null;
  headings: string[];
  text: string;
  wordCount: number;
  // Links off-site, deduped by URL. A page that already links out is far
  // more likely to add one more.
  externalLinks: PageLink[];
  // Links to footballparent.co.uk already on the page (a win, or a mention).
  linksToUs: PageLink[];
  // Same-site links that look like a route to a person: contact, committee,
  // about, welfare, secretary.
  contactPages: PageLink[];
  emails: string[];
}

const MAX_TEXT = 6000;
const CONTACT_HINT = /contact|committee|about|welfare|secretary|officials|get-in-touch|who-we-are|our-team|people/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Asset/placeholder addresses that match the pattern but are not people.
const FAKE_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|@(example|domain|email|sentry|wixpress)\./i;

interface Walked {
  texts: string[];
  headings: string[];
  links: PageLink[];
}

function walk(node: unknown, out: Walked, depth = 0): void {
  if (depth > 12 || node == null) return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  if (typeof o.h_title === "string" && o.h_title.trim()) out.headings.push(o.h_title.trim());
  if (typeof o.text === "string" && o.text.trim()) out.texts.push(o.text.trim());
  if (typeof o.url === "string" && /^https?:|^mailto:/i.test(o.url)) {
    out.links.push({ url: o.url, anchor: typeof o.anchor_text === "string" ? o.anchor_text : typeof o.text === "string" ? o.text : "" });
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === "h_title" || k === "text") continue;
    if (v && typeof v === "object") walk(v, out, depth + 1);
  }
}

export function digestContentParsing(url: string, result: unknown): PageDigest {
  const empty = (problem: string): PageDigest => ({
    url,
    ok: false,
    problem,
    title: null,
    headings: [],
    text: "",
    wordCount: 0,
    externalLinks: [],
    linksToUs: [],
    contactPages: [],
    emails: [],
  });

  const item = (Array.isArray(result) ? result[0] : result) as Record<string, unknown> | undefined;
  if (!item) return empty("no result returned");
  const crawl = item.crawl_status_code ?? (item.items as Record<string, unknown>[] | undefined)?.[0]?.status_code;
  if (typeof crawl === "number" && crawl >= 400) return empty(`page returned HTTP ${crawl}`);

  const items = (item.items as Record<string, unknown>[] | undefined) ?? [item];
  const walked: Walked = { texts: [], headings: [], links: [] };
  for (const it of items) walk(it.page_content ?? it, walked);

  const text = [...new Set(walked.texts)].join("\n").replace(/\n{3,}/g, "\n\n");
  if (!text.trim()) return empty("no readable text (may need JavaScript rendering, or the site blocks crawlers)");

  const pageHost = hostOf(url);
  const seen = new Set<string>();
  const externalLinks: PageLink[] = [];
  const linksToUs: PageLink[] = [];
  const contactPages: PageLink[] = [];
  const emails = new Set<string>();

  for (const l of walked.links) {
    if (/^mailto:/i.test(l.url)) {
      const addr = l.url.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
      if (addr && !FAKE_EMAIL.test(addr)) emails.add(addr);
      continue;
    }
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    const host = hostOf(l.url);
    if (!host) continue;
    const link = { url: l.url, anchor: l.anchor.trim().slice(0, 120) };
    if (host === OUR_DOMAIN || host.endsWith(`.${OUR_DOMAIN}`)) linksToUs.push(link);
    else if (host === pageHost || host.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${host}`)) {
      if (CONTACT_HINT.test(l.url) || CONTACT_HINT.test(l.anchor)) contactPages.push(link);
    } else externalLinks.push(link);
  }
  for (const m of text.match(EMAIL) ?? []) {
    const addr = m.toLowerCase();
    if (!FAKE_EMAIL.test(addr)) emails.add(addr);
  }

  const meta = (items[0]?.meta ?? item.meta) as Record<string, unknown> | undefined;
  const title = (typeof meta?.title === "string" && meta.title) || walked.headings[0] || null;

  return {
    url,
    ok: true,
    problem: null,
    title,
    headings: [...new Set(walked.headings)].slice(0, 30),
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n[...truncated]` : text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    externalLinks: externalLinks.slice(0, 60),
    linksToUs,
    contactPages: contactPages.slice(0, 15),
    emails: [...emails],
  };
}
