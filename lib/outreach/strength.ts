// Domain strength on a 0-100 scale, and how a site compares to ours.
//
// Source is DataForSEO's domain rank (0-1000); /10 puts it on the same
// footing as a DA/DR Graham types in by hand (which the outreach tables
// already store x10 as `authority`). The two metrics aren't identical, but
// they're close enough to answer "how big are they next to me?".
//
// Our own figure lives in seo-data/exports/our-domain-strength.json,
// refreshed by scripts/outreach/research.ts (our-strength, and every
// link-graph run) and shipped with /api/outreach so the admin page can show it.

export interface OurStrength {
  date: string;
  rank: number;
  referringDomains: number | null;
  backlinks: number | null;
  source: string;
}

export function toStrength(rank: number | null | undefined): number | null {
  return rank == null ? null : Math.round(rank / 10);
}

export function compareStrength(theirs: number | null, ours: number | null): string | null {
  if (theirs == null || ours == null) return null;
  const d = theirs - ours;
  if (d <= -5) return "smaller than you";
  if (d < 5) return "about your size";
  if (d < 20) return "bigger than you";
  return "much bigger than you";
}
