// eBay Partner Network reporting, read-only.
//
// EPN's reporting API: GET https://api.partner.ebay.com/Mediapartners/<AccountSID>/Reports/<report>.json
// with HTTP Basic auth (Account SID : Auth Token). Both come from the EPN
// portal: cloud icon (bottom left) > API > Enable API Access. They live in
// EPN_ACCOUNT_SID / EPN_AUTH_TOKEN (.env.local and Vercel, never in code,
// logs or responses). Server-only: never import this from client code.
//
// Two reports are used, from eBay's "Partner Reporting via the New API
// Endpoints" guide:
//   ebay_partner_perf_by_day          Date, CheckoutSite, Clicks, Sales,
//                                     ItemsOrdered, Transactions, Earnings,
//                                     EPC, PctOfSales, CR, AIV, OtherEarnings
//   ebay_partner_transaction_detail   one row per transaction event: EventDate,
//                                     UpdateDate, Status, ItemId, ItemName,
//                                     Quantity, Sales, Earnings, DeltaEarnings,
//                                     CustomId, CampaignId, ClickTimestamp,
//                                     TrafficType, MetaCategoryName, ...
// Parameters: START_DATE / END_DATE (YYYY-MM-DD, on the event date),
// CAMPAIGN_ID (0 = all), CHECKOUT_SITE (0 = all), STATUS (transactions:
// APPROVED, PENDING or ALL).
//
// The guide is from 2018 and gives column names but not the JSON envelope, so
// parsing is deliberately tolerant: rows are the first array found in the
// response, and columns are matched case- and punctuation-insensitively.
// Check the first real response against this and tighten if eBay differs.
//
// Not real time: EPN processes clicks and sales in batches, so today and
// yesterday are usually incomplete, and a sale stays Pending until eBay
// approves it (after the buyer's return window). The site's own click-out
// count (affiliate_clicks) is the real-time number; this is the money.

import { addDays, ukToday } from "@/lib/uk-day";
import { getMerchantClickCounts } from "@/lib/supabase/affiliate-clicks";

const API_BASE = "https://api.partner.ebay.com/Mediapartners";
const REQUEST_TIMEOUT_MS = 20_000;
export const EPN_CAMPAIGN_ID = "5339256925";
export const EPN_MAX_DAYS = 90;

export function epnConfigured(): boolean {
  return Boolean(process.env.EPN_ACCOUNT_SID && process.env.EPN_AUTH_TOKEN);
}

type Row = Record<string, unknown>;

function firstArray(body: unknown): Row[] {
  if (Array.isArray(body)) return body as Row[];
  if (body && typeof body === "object") {
    for (const value of Object.values(body as Record<string, unknown>)) {
      if (Array.isArray(value)) return value as Row[];
    }
    for (const value of Object.values(body as Record<string, unknown>)) {
      const nested = firstArray(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

// Column lookup that ignores case and punctuation ("ItemName", "item_name",
// "Item Name" all match "itemname").
function field(row: Row, ...names: string[]): unknown {
  const wanted = names.map(norm);
  for (const [key, value] of Object.entries(row)) {
    if (wanted.includes(norm(key))) return value;
  }
  return undefined;
}

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// EPN dates arrive as YYYY-MM-DD, an ISO timestamp, or M/D/YYYY. Returns
// YYYY-MM-DD, or "" if it cannot be read.
function isoDate(value: unknown): string {
  const s = str(value);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return "";
}

async function fetchReport(report: string, params: Record<string, string>): Promise<Row[]> {
  const sid = process.env.EPN_ACCOUNT_SID;
  const token = process.env.EPN_AUTH_TOKEN;
  if (!sid || !token) throw new Error("EPN_ACCOUNT_SID / EPN_AUTH_TOKEN are not set");

  const url = new URL(`${API_BASE}/${encodeURIComponent(sid)}/Reports/${report}.json`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      // Status only: the body can echo the request, and the request URL holds
      // the account SID.
      throw new Error(`eBay Partner Network ${report} returned HTTP ${res.status}`);
    }
    return firstArray(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export interface EpnDay {
  date: string;
  epnClicks: number;
  siteClicks: number;
  transactions: number;
  itemsOrdered: number;
  sales: number;
  earnings: number;
}

export interface EpnTransaction {
  eventDate: string;
  updateDate: string;
  status: string;
  itemId: string;
  itemName: string;
  quantity: number;
  sales: number;
  earnings: number;
  customId: string;
  campaignId: string;
  clickDate: string;
  trafficType: string;
  category: string;
}

export interface EpnCustomIdRow {
  customId: string;
  transactions: number;
  sales: number;
  earnings: number;
}

export interface EpnReport {
  configured: boolean;
  days: number;
  from: string;
  to: string;
  fetchedAt: string;
  totals: {
    epnClicks: number;
    siteClicks: number;
    transactions: number;
    itemsOrdered: number;
    sales: number;
    earnings: number;
    approvedEarnings: number;
    pendingEarnings: number;
  };
  byDay: EpnDay[];
  transactions: EpnTransaction[];
  byCustomId: EpnCustomIdRow[];
  siteClicksByPath: { path: string; clicks: number }[];
  // Most recent day eBay reported any clicks or sales for: a rough read of
  // how far behind EPN's processing is running.
  latestEpnDataDate: string | null;
  // Per-source failures, so one report failing still shows the rest.
  errors: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getEpnReport(days: number = 30): Promise<EpnReport> {
  const window = Math.min(Math.max(Math.round(days) || 30, 1), EPN_MAX_DAYS);
  const to = ukToday();
  const from = addDays(to, -(window - 1));
  const errors: string[] = [];

  const empty: EpnReport = {
    configured: epnConfigured(),
    days: window,
    from,
    to,
    fetchedAt: new Date().toISOString(),
    totals: {
      epnClicks: 0,
      siteClicks: 0,
      transactions: 0,
      itemsOrdered: 0,
      sales: 0,
      earnings: 0,
      approvedEarnings: 0,
      pendingEarnings: 0,
    },
    byDay: [],
    transactions: [],
    byCustomId: [],
    siteClicksByPath: [],
    latestEpnDataDate: null,
    errors,
  };

  const site = await getMerchantClickCounts("ebay.co.uk", from).catch((err) => {
    errors.push("Site click count: " + (err instanceof Error ? err.message : String(err)));
    return null;
  });

  const common = { START_DATE: from, END_DATE: to, CAMPAIGN_ID: "0", CHECKOUT_SITE: "0" };

  const [dayRows, txRows] = epnConfigured()
    ? await Promise.all([
        fetchReport("ebay_partner_perf_by_day", common).catch((err) => {
          errors.push("Performance by day: " + (err instanceof Error ? err.message : String(err)));
          return [] as Row[];
        }),
        fetchReport("ebay_partner_transaction_detail", { ...common, STATUS: "ALL" }).catch((err) => {
          errors.push("Transactions: " + (err instanceof Error ? err.message : String(err)));
          return [] as Row[];
        }),
      ])
    : [[] as Row[], [] as Row[]];

  // Perf by day can come back one row per checkout site; sum them per date.
  const epnByDate = new Map<string, Omit<EpnDay, "date" | "siteClicks">>();
  for (const row of dayRows) {
    const date = isoDate(field(row, "Date"));
    if (!date) continue;
    const cur = epnByDate.get(date) ?? { epnClicks: 0, transactions: 0, itemsOrdered: 0, sales: 0, earnings: 0 };
    cur.epnClicks += num(field(row, "Clicks"));
    cur.transactions += num(field(row, "Transactions"));
    cur.itemsOrdered += num(field(row, "ItemsOrdered"));
    cur.sales += num(field(row, "Sales"));
    cur.earnings += num(field(row, "Earnings")) + num(field(row, "OtherEarnings"));
    epnByDate.set(date, cur);
  }

  const siteByDate = new Map((site?.byDay ?? []).map((d) => [d.date, d.clicks]));
  const byDay: EpnDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const e = epnByDate.get(d);
    byDay.push({
      date: d,
      epnClicks: e?.epnClicks ?? 0,
      siteClicks: siteByDate.get(d) ?? 0,
      transactions: e?.transactions ?? 0,
      itemsOrdered: e?.itemsOrdered ?? 0,
      sales: round2(e?.sales ?? 0),
      earnings: round2(e?.earnings ?? 0),
    });
  }

  const transactions: EpnTransaction[] = txRows
    .map((row) => ({
      eventDate: isoDate(field(row, "EventDate")),
      updateDate: isoDate(field(row, "UpdateDate")),
      status: str(field(row, "Status")),
      itemId: str(field(row, "ItemId")),
      itemName: str(field(row, "ItemName")),
      quantity: num(field(row, "Quantity")),
      sales: round2(num(field(row, "Sales"))),
      earnings: round2(num(field(row, "Earnings"))),
      customId: str(field(row, "CustomId")),
      campaignId: str(field(row, "CampaignId")),
      clickDate: isoDate(field(row, "ClickTimestamp")),
      trafficType: str(field(row, "TrafficType")),
      category: str(field(row, "MetaCategoryName", "LeafCategoryName")),
    }))
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : 0));

  const byCustom = new Map<string, EpnCustomIdRow>();
  let approvedEarnings = 0;
  let pendingEarnings = 0;
  for (const t of transactions) {
    const key = t.customId || "(none)";
    const cur = byCustom.get(key) ?? { customId: key, transactions: 0, sales: 0, earnings: 0 };
    cur.transactions += 1;
    cur.sales = round2(cur.sales + t.sales);
    cur.earnings = round2(cur.earnings + t.earnings);
    byCustom.set(key, cur);
    if (/approved|paid/i.test(t.status)) approvedEarnings += t.earnings;
    else pendingEarnings += t.earnings;
  }

  const datesWithData = byDay.filter((d) => d.epnClicks > 0 || d.transactions > 0).map((d) => d.date);

  return {
    ...empty,
    totals: {
      epnClicks: byDay.reduce((s, d) => s + d.epnClicks, 0),
      siteClicks: site?.total ?? 0,
      transactions: byDay.reduce((s, d) => s + d.transactions, 0),
      itemsOrdered: byDay.reduce((s, d) => s + d.itemsOrdered, 0),
      sales: round2(byDay.reduce((s, d) => s + d.sales, 0)),
      earnings: round2(byDay.reduce((s, d) => s + d.earnings, 0)),
      approvedEarnings: round2(approvedEarnings),
      pendingEarnings: round2(pendingEarnings),
    },
    byDay,
    transactions,
    byCustomId: Array.from(byCustom.values()).sort((a, b) => b.earnings - a.earnings),
    siteClicksByPath: site?.byPath ?? [],
    latestEpnDataDate: datesWithData.length ? datesWithData[datesWithData.length - 1] : null,
    errors,
  };
}
