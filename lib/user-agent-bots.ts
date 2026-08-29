// Self-declared crawlers/bots - their user-agent string names them outright
// (Googlebot, Bytespider, curl, headless browsers, etc). Filtered out of
// page_views entirely so that table stays a "real visitor" count, per its
// purpose - see 20260819120000_page_views.sql.
//
// Doesn't attempt to catch a bot spoofing an ordinary browser UA (e.g. the
// 2026-08-29 academy-categories-explained incident's repeated stale-iPhone
// UA) - that's a different, harder problem. See the per-path flood guard in
// lib/supabase/page-views.ts for the defense against that shape instead.

const BOT_UA_PATTERNS = [
  /bot\b/i,
  /spider/i,
  /crawl/i,
  /slurp/i, // Yahoo
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /pinterest/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /python-requests/i,
  /go-http-client/i,
  /node-fetch/i,
  /axios/i,
  /curl\//i,
  /wget/i,
  /scrapy/i,
];

export function isKnownBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // real browsers always send a UA header
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
