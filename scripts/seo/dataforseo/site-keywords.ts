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

// app/sitemap.ts is the repo's established source of truth for real URLs
// (internal-link-audit.mjs already uses it the same way) - `categoryUrl +
// slug` is only a guess and is wrong wherever a page's actual route nests
// under a subcategory folder that frontmatter doesn't reflect (confirmed
// live case: best-football-boots-for-wide-feet-kids and
// best-shin-pads-for-kids-football actually live under
// /football-gear/boots/... and /football-gear/shin-pads/..., not flat
// /football-gear/... - categoryUrl stays "/football-gear" there on purpose
// since that's still the correct breadcrumb target, a shared flat category
// index page). Prefer the sitemap route when one uniquely matches.
function loadSitemapRoutes(): string[] | null {
  const sitemapFile = path.join(REPO_ROOT, "app", "sitemap.ts");
  if (!fs.existsSync(sitemapFile)) return null;
  const raw = fs.readFileSync(sitemapFile, "utf8");
  const arrayMatch = raw.match(/const\s+routes\s*=\s*\[([\s\S]*?)\]/);
  if (!arrayMatch) return null;
  const routes: string[] = [];
  const strRe = /'([^']*)'|"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(arrayMatch[1]))) {
    let r = (m[1] ?? m[2]).trim();
    if (r === "") continue;
    if (!r.startsWith("/")) r = "/" + r;
    routes.push(r);
  }
  return routes;
}

export function getSiteArticleKeywords(): SiteArticleKeyword[] {
  const files = glob.sync("content/**/*.mdx", { cwd: REPO_ROOT });
  const out: SiteArticleKeyword[] = [];

  const sitemapRoutes = loadSitemapRoutes();
  const slugToRoutes = new Map<string, string[]>();
  if (sitemapRoutes) {
    for (const r of sitemapRoutes) {
      const slug = r.split("/").filter(Boolean).pop();
      if (!slug) continue;
      const list = slugToRoutes.get(slug) ?? [];
      list.push(r);
      slugToRoutes.set(slug, list);
    }
  }

  for (const f of files) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, f), "utf8");
    const { data } = matter(raw);
    if (!data.title || !data.categoryUrl) continue;

    const slug = path.basename(f, ".mdx");
    const category = String(data.categoryUrl).replace(/^\//, "");
    const guessedUrlPath = `${data.categoryUrl}/${slug}`;

    let urlPath = guessedUrlPath;
    const categoryFolder = f.replace(/\\/g, "/").replace(/^content\//, "").split("/")[0];
    const candidates = (slugToRoutes.get(slug) ?? []).filter((r) => r.startsWith(`/${categoryFolder}/`));
    if (candidates.length === 1) {
      urlPath = candidates[0];
    }
    // 0 or >1 candidates: keep the categoryUrl-based guess, same as before.

    const url = `${SITE_ORIGIN}${urlPath}`;

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
