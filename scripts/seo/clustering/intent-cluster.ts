// Lightweight token-overlap clustering: groups keywords that are almost
// certainly the same search intent (word-order/pluralisation/filler-word
// variants) so the task brief's "do not recommend separate articles for
// obvious wording variations that should be handled by one page" rule is
// enforced mechanically, not left to eyeballing a flat list. This is a
// heuristic, not semantic/embedding-based clustering - it will under-merge
// true synonyms ("football trials" vs "academy tryouts") and that's a
// deliberate trade-off: a human (or a DataForSEO search_intent call on the
// shortlist) should make the final call on genuine synonym merges, this
// just removes the mechanical near-duplicates first.

const STOPWORDS = new Set([
  "a", "an", "the", "for", "to", "in", "on", "of", "and", "or", "is", "are",
  "how", "what", "when", "where", "why", "which", "do", "does", "your",
  "my", "near", "me", "with", "at", "uk", "best", "top",
]);

function singularise(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function tokenize(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(singularise);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type ClusterInputKeyword = { keyword: string; volume?: number | null };
export type Cluster = { label: string; keywords: ClusterInputKeyword[]; combinedVolume: number };

export function clusterKeywords(keywords: ClusterInputKeyword[], threshold = 0.4): Cluster[] {
  const tokenSets = keywords.map((k) => new Set(tokenize(k.keyword)));

  // Union-find over pairwise similarity above threshold, so clustering is
  // transitive (A~B and B~C merges A, B, C even if A and C alone fall
  // slightly under threshold).
  const parent = keywords.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(i: number, j: number): void {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }

  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      if (jaccard(tokenSets[i], tokenSets[j]) >= threshold) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < keywords.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const clusters: Cluster[] = [];
  for (const indices of groups.values()) {
    const members = indices.map((i) => keywords[i]);
    // Label with the highest-volume keyword (or the shortest as a tiebreak,
    // since shorter is usually the more canonical head term).
    const label = [...members].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0) || a.keyword.length - b.keyword.length)[0].keyword;
    const combinedVolume = members.reduce((sum, m) => sum + (m.volume ?? 0), 0);
    clusters.push({ label, keywords: members, combinedVolume });
  }

  return clusters.sort((a, b) => b.combinedVolume - a.combinedVolume);
}

// De-duplicate near-identical keyword strings before clustering (e.g. the
// same term returned by both keyword_ideas and related_keywords) - exact
// match after tokenisation + rejoin, not a full clustering pass.
export function dedupeKeywords(keywords: ClusterInputKeyword[]): ClusterInputKeyword[] {
  const seen = new Map<string, ClusterInputKeyword>();
  for (const k of keywords) {
    const key = tokenize(k.keyword).sort().join(" ");
    const existing = seen.get(key);
    if (!existing || (k.volume ?? 0) > (existing.volume ?? 0)) seen.set(key, k);
  }
  return [...seen.values()];
}
