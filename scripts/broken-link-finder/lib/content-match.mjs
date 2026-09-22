// Stage 5: match a dead resource's inferred topic against Football Parent's
// actual published content (read straight from content/**/*.mdx via
// gray-matter, already a project dependency - no fetch/sitemap parsing
// needed since this script runs inside the repo checkout).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONFIG } from "../config.mjs";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..", "..");

const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "you", "are", "how", "what", "this",
  "that", "from", "about", "guide", "our", "their", "them", "who", "can",
  "will", "into", "when", "where", "why", "does", "did", "has", "have",
  "football", "uk", "kids", "child", "children",
]);

function tokenise(text) {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

let cachedIndex = null;

export function buildContentIndex() {
  if (cachedIndex) return cachedIndex;
  const contentDir = path.join(REPO_ROOT, CONFIG.contentDir);
  const index = [];

  if (!fs.existsSync(contentDir)) {
    console.warn(`[content-match] ${contentDir} not found - Stage 5 will mark everything "new_article_opportunity"`);
    cachedIndex = index;
    return index;
  }

  for (const category of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = path.join(contentDir, category.name);
    for (const file of fs.readdirSync(categoryDir)) {
      if (!file.endsWith(".mdx")) continue;
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(categoryDir, file), "utf8");
      let frontmatter;
      try {
        frontmatter = matter(raw).data;
      } catch {
        continue;
      }
      const categoryUrl = frontmatter.categoryUrl || `/${category.name}`;
      const url = `${CONFIG.targetSiteUrl}${categoryUrl}/${slug}`;
      const tokens = tokenise([frontmatter.title, frontmatter.description, frontmatter.category].join(" "));
      index.push({ url, title: frontmatter.title || slug, description: frontmatter.description || "", tokens });
    }
  }
  cachedIndex = index;
  return index;
}

// Returns { classification, url, title, score } where classification is one
// of exact_replacement | close_replacement | new_article_opportunity |
// not_relevant. Thresholds are deliberately conservative - "both mention
// football" alone should never clear exact/close.
export function matchReplacement(topicText) {
  const index = buildContentIndex();
  const topicTokens = tokenise(topicText);

  // No usable topic signal at all (Wayback unreachable, generic anchor text,
  // uninformative URL slug) means we genuinely don't know what this was -
  // that's "not_relevant" (low score, filtered out), not "new_article_
  // opportunity" (a confident, actionable-sounding claim we have no basis
  // for). Confirmed against real data: without this, every broken sponsor/
  // business link with no football signal defaulted to "new article needed"
  // and scored 70+, e.g. a BMW dealership and a boxing academy.
  if (topicTokens.size === 0 || index.length === 0) {
    return { classification: "not_relevant", url: "", title: "", score: 0 };
  }

  let best = { url: "", title: "", score: 0 };
  for (const entry of index) {
    const score = jaccard(topicTokens, entry.tokens);
    if (score > best.score) best = { url: entry.url, title: entry.title, score };
  }

  if (best.score >= 0.35) return { ...best, classification: "exact_replacement" };
  if (best.score >= 0.15) return { ...best, classification: "close_replacement" };
  return { ...best, classification: "new_article_opportunity" };
}
