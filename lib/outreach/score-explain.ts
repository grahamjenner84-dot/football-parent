// Plain-English explanation of a priority score, for the hover/tap tooltip
// on /admin/outreach. Reads the reason strings lib/outreach/score.ts stores
// ("fit 7/10 (+14)") and says what each part means and how it was worked
// out. Kept beside score.ts so a change to the formula shows up here.

import { TYPE_WEIGHT } from "./score";

export interface ScorePart {
  label: string;
  points: number;
  why: string;
}

export const SCORE_SUMMARY =
  "Priority score: how soon this prospect should be emailed. It only ranks the backlog against itself (higher is drafted first), it isn't a percentage. Roughly: 60+ strong, 45 to 60 decent, under 45 low.";

const TYPE_WHY: Record<string, string> = {
  expert: "Warm contacts (interviewees, partners) say yes most often.",
  business: "Brands and businesses we already work with, or directories listing the Coach App.",
  blog: "Blogs and editorial sites link out routinely.",
  resource: "Resource and useful-links pages exist to link out.",
  club: "Club pages are exactly our audience but volunteers reply less often.",
  league: "League pages are exactly our audience but volunteers reply less often.",
  other: "Couldn't tell what kind of site this is, so it starts low.",
  media: "National media only links off a press angle.",
  governing_body: "Governing bodies link to commercial partners, not independent sites.",
};

export function explainReason(reason: string): ScorePart {
  const m = reason.match(/^(.*)\s\(([+-]\d+)\)$/);
  const label = m ? m[1] : reason;
  const points = m ? Number(m[2]) : 0;
  const type = Object.keys(TYPE_WEIGHT).find((t) => t === label);
  let why: string;
  if (type) {
    why = `Starting points for a ${type.replace("_", " ")} site (types range from ${Math.min(...Object.values(TYPE_WEIGHT))} to ${Math.max(...Object.values(TYPE_WEIGHT))}). ${TYPE_WHY[type] ?? ""}`;
  } else if (label === "UK") {
    why = "UK site, so a UK parent audience: +10.";
  } else if (/^fit (\d+)\/10$/.test(label)) {
    const f = Number(label.match(/^fit (\d+)/)![1]);
    why = `How naturally our page fits theirs, judged when the page was read (or set by you). Each fit point is worth 2, so ${f}/10 = +${f * 2}. The most it can add is +20 (fit 10/10).`;
  } else if (/^authority (\d+)$/.test(label)) {
    const a = Number(label.match(/(\d+)/)![1]);
    why = `Site strength: ${a} on DataForSEO's 0 to 1000 rank (a DA/DR you enter is multiplied by 10, so DA 37 = 370). 1 point per 40, capped at +15.`;
  } else if (label === "contact found") {
    why = "We have an email address or contact page to send to: +5.";
  } else if (/^waiting (\d+)w$/.test(label)) {
    const w = Number(label.match(/(\d+)/)![1]);
    why = `In the backlog ${w} weeks. +1 for every 4 weeks (max +5), so a decent prospect doesn't get buried under newer ones.`;
  } else if (/season|window|start of season/.test(label)) {
    why = `The page we'd pitch is in its busy time of year (${label}), so the email lands when people care: +8.`;
  } else if (/^you skip/.test(label)) {
    why = "You mark this type of site as not a good lead often, so similar ones drop down the list.";
  } else {
    why = label;
  }
  return { label, points, why };
}

export function explainScore(scoreReasons: string | null): ScorePart[] {
  if (!scoreReasons) return [];
  return scoreReasons.split(/,\s(?=[a-zA-Z])/).map(explainReason);
}
