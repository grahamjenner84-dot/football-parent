// Tier 1: deterministic, free, instant checks. Pure regex/string matching
// against the drafted copy - no API call. See qc-rules.ts for the editable
// rule lists and lib/instagram/qc-flow.ts for how this fits with tiers 2/3.

import {
  AMERICAN_SPELLINGS,
  BADGE_CLICHE_PATTERNS,
  BANNED_AI_SLOP_PHRASES,
  ACADEMIC_BRACKET_CITATION,
  BARE_URL,
  EM_DASH,
  HARVARD_CITATION,
  MARKDOWN_PIPE_TABLE_ROW,
  MARKDOWN_PIPE_TABLE_SEPARATOR,
} from "./qc-rules";

export interface Tier1Finding {
  rule: string;
  hardFail: boolean;
  detail: string;
}

export interface Tier1Result {
  passed: boolean;
  findings: Tier1Finding[];
}

function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_AI_SLOP_PHRASES.filter((phrase) => lower.includes(phrase));
}

function findBadgeCliches(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of BADGE_CLICHE_PATTERNS) {
    const m = text.match(pattern);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function findAmericanSpellings(text: string): string[] {
  const hits: string[] = [];
  for (const [american, british] of Object.entries(AMERICAN_SPELLINGS)) {
    // "mini-soccer" is official FA/UK terminology for U7-U10 football (e.g.
    // "FA Mini-Soccer"), not an Americanism - exclude it from the "soccer"
    // check specifically so this football content site doesn't get a false
    // positive every time it uses the sport's own age-group format name.
    const re = american === "soccer" ? new RegExp(`(?<!mini-)\\bsoccer\\b`, "i") : new RegExp(`\\b${american}\\b`, "i");
    const m = text.match(re);
    if (m) hits.push(`"${m[0]}" -> "${british}"`);
  }
  return hits;
}

function hasMarkdownPipeTable(text: string): boolean {
  if (!MARKDOWN_PIPE_TABLE_ROW.test(text)) return false;
  return MARKDOWN_PIPE_TABLE_SEPARATOR.test(text);
}

// Runs all Tier 1 checks against the visible copy (hook + points, excludes
// the internal Source provenance line - see qc-parse.ts visibleCopy()).
export function runTier1(text: string): Tier1Result {
  const findings: Tier1Finding[] = [];

  if (EM_DASH.test(text)) {
    findings.push({ rule: "em_dash", hardFail: true, detail: "Contains an em dash (—). Use commas, colons, or restructure the sentence." });
  }

  const bannedPhrases = findBannedPhrases(text);
  if (bannedPhrases.length > 0) {
    findings.push({
      rule: "banned_ai_slop_phrase",
      hardFail: true,
      detail: `Contains banned AI-slop phrase(s): ${bannedPhrases.map((p) => `"${p}"`).join(", ")}`,
    });
  }

  const badgeHits = findBadgeCliches(text);
  if (badgeHits.length > 0) {
    findings.push({
      rule: "badge_cliche",
      hardFail: true,
      detail: `Contains "badge" framing cliche: ${badgeHits.map((h) => `"${h}"`).join(", ")}`,
    });
  }

  const americanHits = findAmericanSpellings(text);
  if (americanHits.length > 0) {
    findings.push({
      rule: "american_spelling",
      hardFail: false,
      detail: `American spelling(s) found, use British English: ${americanHits.join(", ")}`,
    });
  }

  if (hasMarkdownPipeTable(text)) {
    findings.push({ rule: "markdown_pipe_table", hardFail: true, detail: "Contains a markdown pipe table - not usable in social copy." });
  }

  if (ACADEMIC_BRACKET_CITATION.test(text)) {
    findings.push({ rule: "academic_citation", hardFail: true, detail: "Contains a bracketed numeric citation, e.g. [1]." });
  }

  if (HARVARD_CITATION.test(text)) {
    findings.push({ rule: "academic_citation", hardFail: true, detail: "Contains a Harvard-style citation, e.g. (Smith, 2020)." });
  }

  if (BARE_URL.test(text)) {
    findings.push({ rule: "bare_url", hardFail: true, detail: "Contains a bare URL - links don't work in Instagram captions/slides." });
  }

  const passed = findings.every((f) => !f.hardFail);
  return { passed, findings };
}
