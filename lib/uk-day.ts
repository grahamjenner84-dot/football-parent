// One definition of "a day" for every first-party report on /admin/seo and
// the MCP tools: the UK calendar day, midnight to midnight in
// Europe/London (BST in summer, GMT in winter). The Coach App and Progress
// databases already count their "today" from UK midnight, so the site's own
// numbers (page views, sign-up events, clicks) use the same day and the two
// line up on the dashboard. Before this the site bucketed by UTC date, so
// anything between 00:00 and 01:00 BST landed on the previous day.
//
// Plain functions with no server-only imports, so the dashboard (a client
// component) can use them as well as the report modules.

const UK_TIME_ZONE = "Europe/London";
const HOUR_MS = 60 * 60 * 1000;

const ukDateParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatUkDate(ms: number): string {
  const parts = ukDateParts.formatToParts(new Date(ms));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// The UK clocks only ever change on the hour (01:00 UTC), so every instant
// in one UTC hour falls on the same UK date. Caching per hour keeps a report
// over tens of thousands of rows from formatting each one.
const ukDateByUtcHour = new Map<number, string>();

/** The UK calendar date (YYYY-MM-DD) an instant falls on. */
export function ukDay(instant: string | number | Date): string {
  const hour = Math.floor(new Date(instant).getTime() / HOUR_MS);
  let date = ukDateByUtcHour.get(hour);
  if (date === undefined) {
    date = formatUkDate(hour * HOUR_MS);
    ukDateByUtcHour.set(hour, date);
  }
  return date;
}

/** Today's UK date (YYYY-MM-DD). */
export function ukToday(): string {
  return ukDay(Date.now());
}

/** `date` (YYYY-MM-DD) moved by `n` calendar days. Pure date arithmetic. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Every date from `from` to `to` (YYYY-MM-DD), inclusive, oldest first. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

// Minutes the UK is ahead of UTC at an instant: 60 in BST, 0 in GMT.
// Read from ICU's "GMT+01:00" label rather than round-tripping a formatted
// string through new Date(), which would apply the host's own time zone.
function ukOffsetMinutes(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: UK_TIME_ZONE, timeZoneName: "longOffset" }).formatToParts(
    new Date(ms)
  );
  const label = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = label.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
}

/** The instant (ISO, UTC) the UK day `date` begins: its midnight. */
export function ukDayStart(date: string): string {
  const utcMidnight = Date.parse(`${date}T00:00:00.000Z`);
  // UK midnight falls at 23:00 or 00:00 UTC, and the clocks change at 01:00
  // UTC, so the offset two hours before UTC midnight is the one in force.
  const offset = ukOffsetMinutes(utcMidnight - 2 * HOUR_MS);
  return new Date(utcMidnight - offset * 60 * 1000).toISOString();
}
