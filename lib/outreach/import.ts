// Bulk import of outreach Graham has already done by hand, so the queue knows
// every site he has approached. That history is what stops discovery (or a
// manual add) proposing a site he emailed months ago as if it were new.
//
// Input is whatever comes out of a spreadsheet: pasted cells (tab-separated)
// or a CSV file, with a header row. Column names are matched loosely
// ("Website", "URL", "Site" all work) because the source is a hand-kept
// sheet, not an export with a fixed schema.
//
// Pure: parsing and status rules only. Writes happen in
// lib/supabase/outreach.ts importHistory().

import { hostOf } from "./quality";
import { CHASE_AFTER_DAYS, MAX_CHASES, type OutreachStatus } from "./lifecycle";

export interface HistoryRow {
  line: number;
  url: string;
  // Site or club name from the sheet, used as the prospect's title.
  title: string | null;
  domain: string;
  emailedAt: string | null;
  // DA/DR style, 0-100, as typed.
  domainScore: number | null;
  contactEmail: string | null;
  status: OutreachStatus | null;
  // What was pitched ("Q/a on girls football and their mission").
  angle: string | null;
  notes: string | null;
  wonUrl: string | null;
}

export interface ParseResult {
  rows: HistoryRow[];
  errors: string[];
  columns: Record<string, string | null>;
}

// Headers that might hold the web address. Picked by content, not name
// alone: a "Site" column is often the site's name, with the address under
// "URL" further along.
const URL_HEADER = /^(url|urls|website|web ?site|web address|site|site url|page|page url|link to page|domain|prospect)$/i;

const COLUMN_NAMES: Record<keyof Omit<HistoryRow, "line" | "domain" | "url">, RegExp> = {
  title: /^(site|site name|name|website name|organisation|organization|club|club name|business)$/i,
  emailedAt: /^(date|emailed|date emailed|sent|date sent|contacted|date contacted|when contacted|when emailed|first contact|outreach date)$/i,
  domainScore: /^(da|dr|dr\/da|da\/dr|domain score|domain auth(ority)?|domain rating|authority|score)$/i,
  contactEmail: /^(email|e-mail|contact|contact email|email address|to)$/i,
  status: /^(status|outcome|result|response|reply)$/i,
  angle: /^(what pitched|pitched|pitch|angle|what i pitched|offer)$/i,
  notes: /^(notes?|comments?)$/i,
  wonUrl: /^(link|link url|live link|backlink|won link|link live at)$/i,
};

// Minimal delimited-text parser: handles quoted cells with embedded
// delimiters, quotes and newlines. Tab if the header has a tab (pasted from a
// spreadsheet), comma otherwise.
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// A date at the start of a cell, possibly without a year and with a note
// after it: "14/06, replied to their email" -> 14 June, note "replied to
// their email". A missing year means the most recent 14 June that isn't in
// the future, since this is a record of things already done.
export function splitLeadingDate(raw: string, now = new Date()): { date: string | null; rest: string } {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?(?=$|[\s,;:-])/);
  if (m) {
    const rest = s.slice(m[0].length).replace(/^[\s,;:-]+/, "").trim();
    if (m[3]) return { date: iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]), rest };
    let date = iso(now.getUTCFullYear(), +m[2], +m[1]);
    if (date && new Date(date) > now) date = iso(now.getUTCFullYear() - 1, +m[2], +m[1]);
    return { date, rest };
  }
  return { date: parseUkDate(s), rest: "" };
}

// UK dates first: 03/04/2026 is 3 April. Also ISO, "3 Apr 2026", "3 April 26".
export function parseUkDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{2}|\d{4})$/i);
  if (m) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    if (month) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], month, +m[1]);
  }
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString();
}

export function parseStatus(raw: string): OutreachStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^(won|linked|link(ed)? live|live|yes|got (a )?link|success)/.test(s)) return "won";
  if (/(no reply|no response|none|ignored|ghosted|nothing|chased)/.test(s)) return "no_reply";
  if (/^(no|declined|said no|not interested|rejected|refused|lost)/.test(s)) return "lost";
  if (/^(replied|reply|responded|in (progress|discussion)|talking|waiting on them|maybe|positive)/.test(s)) return "replied";
  if (/^(sent|emailed|contacted|pending|awaiting)/.test(s)) return "sent";
  return null;
}

function normaliseUrl(raw: string): string | null {
  const s = raw.trim().replace(/^<|>$/g, "");
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseHistory(text: string, now = new Date()): ParseResult {
  const table = parseDelimited(text);
  const errors: string[] = [];
  const columns: Record<string, string | null> = {};
  if (table.length < 2) return { rows: [], errors: ["Need a header row plus at least one row of data."], columns };

  const header = table[0].map((h) => h.trim());
  const data = table.slice(1);

  // The web-address column is whichever URL-ish header holds the most
  // cells that actually look like addresses (have a dot, no spaces).
  const looksLikeUrl = (c: string) => /^\S+\.\S+$/.test(c.trim()) && !/@/.test(c) && normaliseUrl(c) !== null;
  let urlCol = -1;
  let best = 0;
  header.forEach((h, i) => {
    if (!URL_HEADER.test(h)) return;
    const hits = data.filter((r) => looksLikeUrl(r[i] ?? "")).length;
    if (hits > best) {
      best = hits;
      urlCol = i;
    }
  });
  columns.url = urlCol >= 0 ? header[urlCol] : null;
  if (urlCol < 0) {
    return { rows: [], errors: [`No column of web addresses found. Headers seen: ${header.join(", ")}. Name the address column "URL".`], columns };
  }

  const idx: Partial<Record<keyof typeof COLUMN_NAMES | "url", number>> = { url: urlCol };
  for (const [key, re] of Object.entries(COLUMN_NAMES) as [keyof typeof COLUMN_NAMES, RegExp][]) {
    const i = header.findIndex((h, n) => re.test(h) && !Object.values(idx).includes(n));
    if (i >= 0) idx[key] = i;
    columns[key] = i >= 0 ? header[i] : null;
  }

  const rows: HistoryRow[] = [];
  data.forEach((cells, n) => {
    const line = n + 2;
    const get = (k: keyof typeof COLUMN_NAMES | "url") => (idx[k] === undefined ? "" : (cells[idx[k]!] ?? "").trim());
    const url = normaliseUrl(get("url"));
    if (!url || !looksLikeUrl(get("url"))) {
      errors.push(`Row ${line}: no web address ("${get("url")}"), skipped.`);
      return;
    }
    const dateRaw = get("emailedAt");
    const { date: emailedAt, rest: dateNote } = splitLeadingDate(dateRaw, now);
    if (dateRaw && !emailedAt) errors.push(`Row ${line}: couldn't read the date in "${dateRaw}" (use 14/06 or 14/06/2026), imported without it.`);
    const scoreRaw = get("domainScore");
    const score = scoreRaw ? Number(scoreRaw.replace(/[^\d.]/g, "")) : NaN;
    if (scoreRaw && !(score >= 0 && score <= 100)) errors.push(`Row ${line}: domain score "${scoreRaw}" isn't 0-100, ignored.`);
    const statusRaw = get("status");
    const status = parseStatus(statusRaw);
    if (statusRaw && !status) errors.push(`Row ${line}: didn't recognise status "${statusRaw}", worked it out from the date instead.`);
    const email = get("contactEmail");
    const won = normaliseUrl(get("wonUrl"));
    rows.push({
      line,
      url,
      title: get("title") || null,
      domain: hostOf(url),
      emailedAt,
      domainScore: score >= 0 && score <= 100 ? score : null,
      contactEmail: /@/.test(email) ? email.toLowerCase() : null,
      status: status ?? (won ? "won" : null),
      angle: get("angle") || null,
      // Text after the date ("replied to their email") is kept word for word
      // rather than guessed into a status: "replied" there could mean either
      // side. The status column, if there is one, is what sets the status.
      notes: [dateNote && dateRaw && !emailedAt ? "" : dateNote, get("notes")].filter(Boolean).join("; ") || null,
      wonUrl: won,
    });
  });
  return { rows, errors, columns };
}

// Anything emailed longer ago than the full chase window is closed as
// no reply rather than dropped into this week's chase-ups: an old approach
// shouldn't suddenly generate a pile of "just floating this back up" emails.
export const STALE_AFTER_DAYS = CHASE_AFTER_DAYS * (MAX_CHASES + 1);

export interface ResolvedStatus {
  status: OutreachStatus;
  sent_at: string | null;
  last_contact_at: string | null;
  next_action_at: string | null;
  chase_count: number;
}

export function resolveImportedStatus(row: Pick<HistoryRow, "status" | "emailedAt">, now = new Date()): ResolvedStatus {
  const sentAt = row.emailedAt;
  const base = { sent_at: sentAt, last_contact_at: sentAt, next_action_at: null, chase_count: 0 };
  const status = row.status ?? (sentAt ? "sent" : "no_reply");
  if (status !== "sent") return { ...base, status };

  // "Sent", or a date with no status: still waiting, unless it's old.
  if (!sentAt) return { ...base, status: "no_reply" };
  const ageDays = (now.getTime() - new Date(sentAt).getTime()) / 86_400_000;
  if (ageDays > STALE_AFTER_DAYS) return { ...base, status: "no_reply" };
  // Recent: rejoin the normal chase flow. Assume no chases sent yet; the
  // first one falls due 7 days after the original email (possibly already).
  return {
    ...base,
    status: "sent",
    next_action_at: new Date(new Date(sentAt).getTime() + CHASE_AFTER_DAYS * 86_400_000).toISOString(),
  };
}
