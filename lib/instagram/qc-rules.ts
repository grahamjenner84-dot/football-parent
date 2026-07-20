// Tier 1 deterministic rule config for the social QC layer (Phase D). Pulled
// from the two article-writing skills so social copy is held to the same
// voice/slop/factual-accuracy rules as articles - see CLAUDE.md "Skills" and
// the Phase D task brief for the RELAX/KEEP split (tone/hedging/"any sport"
// are relaxed for social; slop phrases, factual accuracy and never-promise-
// success stay hard fails regardless of format).
//
// Edit the arrays below to extend the rule set - no other code changes
// needed. Matching is case-insensitive substring matching against the
// combined hook + points text.

// Combined from:
//   .claude/skills/football-parent-articles/references/fact-checking-and-style.md
//     ("Banned phrases (cut or rewrite on sight)")
//   .claude/skills/football-parent-review/SKILL.md section 6 ("AI Slop")
// Deduplicated and normalised (trailing "..." stripped, case-folded).
export const BANNED_AI_SLOP_PHRASES: string[] = [
  "every child is different",
  "every child develops differently",
  "it's important to remember",
  "it is important to remember",
  "ultimately",
  "at the end of the day",
  "the key thing is",
  "in today's game",
  "football is a journey",
  "success looks different for everyone",
  "there is no one-size-fits-all answer",
  "trust the process",
  "focus on the process not the outcome",
  "stay positive",
  "keep supporting them",
  "believe in yourself",
  "hard work always pays off",
  "in conclusion",
  "it depends",
  "focus on enjoyment",
  "support your child",
  "the best environment is the one that",
];

// "Badge" framing clichés - CLAUDE.md editorial rules, section "Editorial rules".
export const BADGE_CLICHE_PATTERNS: RegExp[] = [
  /\bwithout the badge\b/i,
  /\bnot about the badge\b/i,
  /\bearning (your|the) badge\b/i,
  /\bbadge on (your|the|his|her|their) shirt\b/i,
  /\bbadge\b/i, // catch-all: "badge" as a football metaphor is a site-wide cliché, flag any use
];

// Common American spellings/terms worth flagging for British English - not
// exhaustive, extend as new ones show up. american -> british.
export const AMERICAN_SPELLINGS: Record<string, string> = {
  color: "colour",
  colors: "colours",
  favorite: "favourite",
  favorites: "favourites",
  honor: "honour",
  behavior: "behaviour",
  neighbor: "neighbour",
  neighbors: "neighbours",
  center: "centre",
  centers: "centres",
  theater: "theatre",
  defense: "defence",
  offense: "offence",
  realize: "realise",
  realized: "realised",
  organize: "organise",
  organized: "organised",
  recognize: "recognise",
  recognized: "recognised",
  analyze: "analyse",
  traveled: "travelled",
  traveling: "travelling",
  canceled: "cancelled",
  cancelling: "cancelling",
  fueled: "fuelled",
  gray: "grey",
  mom: "mum",
  moms: "mums",
  soccer: "football",
  cleats: "boots",
  gotten: "got",
  math: "maths",
};

// Structural checks - not phrase lists, evaluated as regexes directly against
// the raw text in qc-tier1.ts.
export const MARKDOWN_PIPE_TABLE_ROW = /^\s*\|.+\|\s*$/m;
export const MARKDOWN_PIPE_TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/m;
export const ACADEMIC_BRACKET_CITATION = /\[\d+\]/;
export const HARVARD_CITATION = /\([A-Z][a-zA-Z'-]+(?:\s(?:and|&|et al\.?)\s[A-Z][a-zA-Z'-]+)?,?\s(19|20)\d{2}\)/;
export const BARE_URL = /https?:\/\/\S+/i;
export const EM_DASH = /—/;
