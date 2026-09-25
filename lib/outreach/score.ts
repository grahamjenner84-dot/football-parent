// Priority score for the outreach backlog. Recomputed every weekly run (and
// on read in the admin page), so the order changes as prospects age, seasons
// turn and Graham skips things, rather than being fixed at import time.
//
// It is a ranking aid, not a quality judgement: anything that reaches the
// backlog has already passed lib/outreach/quality.ts. Every point comes with
// a reason string so the admin page can show why something is near the top.

import type { ProspectType } from "./quality";

export interface ScoreInput {
  type: ProspectType;
  isUk: boolean | null;
  // DataForSEO bulk_ranks domain rank (0-1000). Screening signal only.
  authority?: number | null;
  // 0-10 relevance judged by the weekly run (how naturally our page fits
  // theirs). Null for old imports that were never judged.
  fit?: number | null;
  fpPage?: string | null;
  hasContact: boolean;
  createdAt: string;
  // Share of this prospect type Graham has skipped (0-1), from past actions.
  skipRate?: number;
  now?: Date;
}

export interface ScoreResult {
  score: number;
  reasons: string[];
}

// Starting weights by type. Blogs and resource pages are editorial and
// already in the habit of linking out; clubs and leagues say yes less often
// but a "resources for parents" page on a club site is exactly our audience.
// Expert/business are warm contacts (interviewees, partners) and convert best.
export const TYPE_WEIGHT: Record<ProspectType, number> = {
  expert: 40,
  business: 34,
  blog: 32,
  resource: 30,
  club: 26,
  league: 26,
  other: 18,
  media: 10,
  governing_body: 5,
};

// When each section of the site is most pitchable. Trials content is asked
// about from the new year through the spring trial windows; gear peaks at
// the start of the season and before Christmas; the Coach App is a
// start-of-season decision for managers.
const SEASONS: { prefix: string; months: number[]; label: string }[] = [
  { prefix: "/academy-trials", months: [1, 2, 3, 4, 5, 6], label: "trials season" },
  { prefix: "/academy-pathway", months: [1, 2, 3, 4, 5, 6, 9, 10], label: "academy recruitment window" },
  { prefix: "/football-gear", months: [7, 8, 9, 11, 12], label: "kit-buying season" },
  { prefix: "/football-parent-coach-app", months: [7, 8, 9, 10], label: "start of season" },
  { prefix: "/coach-app", months: [7, 8, 9, 10], label: "start of season" },
  { prefix: "/coaching", months: [7, 8, 9, 10], label: "start of season" },
];

export function scoreProspect(input: ScoreInput): ScoreResult {
  const reasons: string[] = [];
  const now = input.now ?? new Date();

  let score = TYPE_WEIGHT[input.type];
  reasons.push(`${input.type} (+${score})`);

  if (input.isUk === true) {
    score += 10;
    reasons.push("UK (+10)");
  }

  if (input.fit != null) {
    const pts = Math.round(Math.max(0, Math.min(10, input.fit)) * 2);
    score += pts;
    reasons.push(`fit ${input.fit}/10 (+${pts})`);
  }

  if (input.authority != null && input.authority > 0) {
    const pts = Math.min(15, Math.round(input.authority / 40));
    if (pts > 0) {
      score += pts;
      reasons.push(`authority ${input.authority} (+${pts})`);
    }
  }

  if (input.hasContact) {
    score += 5;
    reasons.push("contact found (+5)");
  }

  if (input.fpPage) {
    const month = now.getUTCMonth() + 1;
    const season = SEASONS.find((s) => input.fpPage!.startsWith(s.prefix));
    if (season && season.months.includes(month)) {
      score += 8;
      reasons.push(`${season.label} (+8)`);
    }
  }

  // Slow lift for prospects that have sat in the backlog, so a decent one
  // isn't buried forever by fresher arrivals.
  const weeks = Math.floor((now.getTime() - new Date(input.createdAt).getTime()) / (7 * 86_400_000));
  const agePts = Math.min(5, Math.floor(Math.max(0, weeks) / 4));
  if (agePts > 0) {
    score += agePts;
    reasons.push(`waiting ${weeks}w (+${agePts})`);
  }

  if (input.skipRate && input.skipRate > 0) {
    const pts = Math.round(input.skipRate * 15);
    if (pts > 0) {
      score -= pts;
      reasons.push(`you skip ${Math.round(input.skipRate * 100)}% of ${input.type} prospects (-${pts})`);
    }
  }

  return { score, reasons };
}
