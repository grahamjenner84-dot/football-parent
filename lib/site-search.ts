import type Fuse from "fuse.js";
import type { SearchIndexEntry } from "@/lib/search-index";

// Fuse's fuzzy matching penalises how far into a field a match falls, so an
// exact keyword sitting mid-description (e.g. "XbotGo" inside the veo-camera
// article's description) can score below the threshold and never surface,
// even though the term is right there. Checking for a literal substring
// match first, position-independent, guarantees "does this word appear on
// the page" always works, then fuzzy search fills in the typo-tolerant
// results around it.
//
// The substring check has no word-boundary awareness, so below this length
// it starts matching fragments inside unrelated words (e.g. "us" inside
// "guide") - confirmed against the real index (1 match via fuzzy alone vs
// 9 via substring). Below the threshold, skip straight to fuzzy, which is
// already reasonable at short lengths.
const MIN_EXACT_MATCH_LENGTH = 3;

export function searchArticles(
  fuse: Fuse<SearchIndexEntry>,
  index: SearchIndexEntry[],
  query: string
): SearchIndexEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = trimmed.toLowerCase();
  const exact =
    needle.length < MIN_EXACT_MATCH_LENGTH
      ? []
      : index.filter(
          (entry) =>
            entry.title.toLowerCase().includes(needle) ||
            entry.description.toLowerCase().includes(needle) ||
            entry.category.toLowerCase().includes(needle)
        );

  const seen = new Set(exact.map((entry) => entry.url));
  const fuzzy = fuse.search(trimmed).map((result) => result.item);

  return [...exact, ...fuzzy.filter((entry) => !seen.has(entry.url))];
}
