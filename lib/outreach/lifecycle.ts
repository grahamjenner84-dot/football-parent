// Outreach status machine and the generic chase-up copy. Pure functions so
// the API route, the weekly-run CLI and the tests all agree on what "mark
// sent" or "chase due" means.
//
//   backlog -> drafted -> sent -> chase_1 -> chase_2 -> no_reply
//                            \________\_________\-> replied -> won | lost
//   any open state -> skipped (Graham's call) | parked | won (link spotted)

export const STATUSES = [
  "backlog",
  "drafted",
  "sent",
  "chase_1",
  "chase_2",
  "replied",
  "won",
  "lost",
  "no_reply",
  "skipped",
  "parked",
  "rejected",
] as const;
export type OutreachStatus = (typeof STATUSES)[number];

// Waiting on them: these are the states a chase-up or a link check applies to.
export const AWAITING: OutreachStatus[] = ["sent", "chase_1", "chase_2"];
export const CLOSED: OutreachStatus[] = ["won", "lost", "no_reply", "skipped", "rejected"];

export const CHASE_AFTER_DAYS = 7;
export const MAX_CHASES = 2;
export const WEEKLY_NEW_DRAFTS = 15;
export const MONTHLY_LINK_TARGET = 3;

// The site's public contact address (same one as the about/contact pages).
// Hardcoded rather than env-driven because the admin page imports this
// module client-side.
export const OUTREACH_FROM_EMAIL = "footballparentuk@gmail.com";

export interface OutreachRow {
  status: OutreachStatus;
  chase_count: number;
  next_action_at: string | null;
}

export type OutreachAction =
  | { action: "mark_sent" }
  | { action: "mark_chased" }
  | { action: "replied" }
  | { action: "won"; url?: string }
  | { action: "lost" }
  | { action: "no_reply" }
  | { action: "skip" }
  | { action: "park" }
  | { action: "restore" };

export interface Transition {
  status: OutreachStatus;
  chase_count?: number;
  next_action_at?: string | null;
  sent_at?: string;
  last_contact_at?: string;
  won_link_url?: string | null;
}

function addDays(d: Date, days: number): string {
  return new Date(d.getTime() + days * 86_400_000).toISOString();
}

export function applyAction(row: OutreachRow, a: OutreachAction, now = new Date()): Transition {
  const iso = now.toISOString();
  switch (a.action) {
    case "mark_sent":
      if (row.status !== "drafted" && row.status !== "backlog") throw new Error(`can't send from ${row.status}`);
      return { status: "sent", sent_at: iso, last_contact_at: iso, chase_count: 0, next_action_at: addDays(now, CHASE_AFTER_DAYS) };
    case "mark_chased": {
      if (!AWAITING.includes(row.status) || row.chase_count >= MAX_CHASES) throw new Error(`no chase due from ${row.status}`);
      const n = row.chase_count + 1;
      return {
        status: n === 1 ? "chase_1" : "chase_2",
        chase_count: n,
        last_contact_at: iso,
        next_action_at: addDays(now, CHASE_AFTER_DAYS),
      };
    }
    case "replied":
      return { status: "replied", next_action_at: null };
    case "won":
      return { status: "won", next_action_at: null, won_link_url: a.url ?? null };
    case "lost":
      return { status: "lost", next_action_at: null };
    case "no_reply":
      return { status: "no_reply", next_action_at: null };
    case "skip":
      return { status: "skipped", next_action_at: null };
    case "park":
      return { status: "parked", next_action_at: null };
    case "restore":
      return { status: "backlog", next_action_at: null };
  }
}

// What the queue wants done with an awaiting prospect right now.
export function dueAction(row: OutreachRow, now = new Date()): "chase" | "close" | null {
  if (!AWAITING.includes(row.status) || !row.next_action_at) return null;
  if (new Date(row.next_action_at) > now) return null;
  return row.chase_count >= MAX_CHASES ? "close" : "chase";
}

// Generic chase-ups. Short on purpose: the original email is quoted
// underneath when Graham replies in the thread, so these only need to nudge.
// `personal` is the one line the weekly run tailors (e.g. something new on
// their site); it is optional so a chase still works without it.
export function chaseBody(opts: { firstName?: string | null; n: 1 | 2; personal?: string | null }): string {
  const hi = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";
  const personal = opts.personal ? `\n\n${opts.personal.trim()}` : "";
  if (opts.n === 1) {
    return `${hi}\n\nJust floating this back to the top of your inbox in case it got buried. Happy to send anything over that would make it easier.${personal}\n\nThanks,\nGraham\nFootball Parent`;
  }
  return `${hi}\n\nLast nudge from me on this, I know how busy club and site inboxes get. If it's not a fit, no problem at all and I won't follow up again.${personal}\n\nThanks,\nGraham\nFootball Parent`;
}

// Opt-out line appended to every first-touch email. Keeps cold email to club
// volunteers (often personal addresses) on the right side of PECR and reads
// as courteous rather than salesy.
export const OPT_OUT_LINE = "If this isn't relevant, just say and I won't follow up.";

export function gmailComposeUrl(opts: { to?: string | null; subject: string; body: string }): string {
  const p = new URLSearchParams({ view: "cm", fs: "1", su: opts.subject, body: opts.body });
  if (opts.to) p.set("to", opts.to);
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(OUTREACH_FROM_EMAIL)}&${p.toString()}`;
}

// Opens Gmail searched to the original thread, so a chase goes as a reply
// (original quoted underneath) rather than a fresh email.
export function gmailThreadSearchUrl(to: string): string {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(OUTREACH_FROM_EMAIL)}#search/${encodeURIComponent(`to:${to}`)}`;
}
