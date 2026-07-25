// Derives one candidate target keyword per Football Parent article from its
// MDX frontmatter title - "the keywords we generally target" as a real,
// site-derived list rather than a hand-picked sample. Used by
// scripts/seo/cli/live-search-volume.ts to populate real Google Ads volume
// figures against the site's actual content, and to seed the `pages` table
// so the article tracker has a row (with a primary_keyword guess) for every
// published article.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { glob } from "glob";
import { REPO_ROOT } from "../shared/env";

const SITE_ORIGIN = "https://www.footballparent.co.uk";

export type SiteArticleKeyword = {
  keyword: string; // cleaned, search-shaped phrase derived from the title
  rawTitle: string;
  url: string;
  mdxFile: string;
  category: string;
  slug: string;
};

// Titles are headline-shaped ("Core phrase: explanatory subtitle") not
// query-shaped - a parent doesn't type "Football Trials Near Me: A
// Realistic Parent's Guide to Academy Recruitment in the UK" into Google.
// Keep only the head phrase before the first colon, and strip common
// non-searched suffixes.
function cleanTitle(title: string): string {
  let t = title
    .replace(/\s*\|\s*Football Parent\s*$/i, "")
    .replace(/[:,]?\s*A Parent'?s Guide\s*$/i, "")
    .replace(/\?$/, "")
    .trim();

  const colonIndex = t.indexOf(":");
  if (colonIndex > 0) t = t.slice(0, colonIndex);

  t = t
    .replace(/\s*Explained\s*$/i, "")
    .replace(/\s*Guide for Parents\s*$/i, "")
    .replace(/\?$/, "")
    .trim();

  // DataForSEO rejects the whole batch if any single keyword contains
  // these characters (confirmed against the real API: "(JPL)" in one title
  // returned "Invalid Field: 'keywords' ... invalid characters or
  // symbols" for the entire request, not just that item).
  // DataForSEO's forbidden-symbol list isn't fully documented inline (it
  // points to a help-centre article rather than enumerating it) - after
  // two live $0 validation rejections (parentheses, then a stray "?", then
  // a comma), whitelist to safe characters instead of chasing the list
  // symbol by symbol.
  return t
    .replace(/[^a-zA-Z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSiteArticleKeywords(): SiteArticleKeyword[] {
  const files = glob.sync("content/**/*.mdx", { cwd: REPO_ROOT });
  const out: SiteArticleKeyword[] = [];

  for (const f of files) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, f), "utf8");
    const { data } = matter(raw);
    if (!data.title || !data.categoryUrl) continue;

    const slug = path.basename(f, ".mdx");
    const category = String(data.categoryUrl).replace(/^\//, "");
    const url = `${SITE_ORIGIN}${data.categoryUrl}/${slug}`;

    out.push({
      keyword: cleanTitle(String(data.title)),
      rawTitle: String(data.title),
      url,
      mdxFile: f,
      category,
      slug,
    });
  }

  return out;
}
