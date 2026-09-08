import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Landing page variants for the Coach App, one MDX file each, so a new one
// is a content change rather than a code change - the whole point being that
// adding a variant for a new ad group doesn't need a developer.
//
// Deliberately separate from lib/content.ts: articles carry a category,
// readTime, sections and a date, and belong in the sitemap and the search
// index. These carry a headline, a CTA label and an index flag, and mostly
// belong in none of those. Sharing one frontmatter type would mean both sets
// of fields optional everywhere and neither validated.
//
// Note this is the site's first dynamic route - every article is its own
// hand-written page.tsx. That convention is exactly what this exists to
// avoid here: a per-variant page.tsx would put a developer back in the loop
// for every new landing page.

export interface LandingFrontmatter {
  /** The headline. Should echo the ad group's promise, not the brand. */
  h1: string;
  /** One or two sentences under the headline, above the form. */
  subhead: string;
  /** Button text on the sign-up form. */
  ctaLabel: string;
  /** <title> and meta description. Fall back to h1/subhead when omitted. */
  seoTitle?: string;
  seoDescription?: string;
  /** Whether Google may index this page.
   *
   * false for PPC variants, and that is the deliberate default. Several
   * near-identical pages all targeting "coach app" queries would cannibalise
   * each other, which the SEO reports already track as a distinct problem.
   * Ads serve perfectly well to a noindex page - a variant needs to convert,
   * not to rank. Exactly one page in this set should set this true. */
  index?: boolean;
  /** Show the app screenshot carousel between the hero and the body copy. */
  carousel?: boolean;
}

export interface LandingPage {
  frontmatter: LandingFrontmatter;
  content: string;
  slug: string;
}

const landingDirectory = path.join(process.cwd(), "content", "landing");

/** The main, indexable Coach App page — /football-parent-coach-app itself,
 * rendered by that route's own page.tsx rather than by the [variant] route.
 *
 * It lives here with the variants so the page that actually ranks is editable
 * the same way they are, which was the point of the whole exercise: the one
 * page worth tuning shouldn't be the one that needs a developer. */
export const MAIN_LANDING_SLUG = "main";

/** Variants only. The main page is excluded deliberately: it already has a
 * route of its own, and letting it through here would publish the identical
 * page a second time at /football-parent-coach-app/main — a duplicate of the
 * one page on this site that is supposed to rank, which is the last place
 * you want one. */
export function getLandingSlugs(): string[] {
  if (!fs.existsSync(landingDirectory)) return [];
  return fs
    .readdirSync(landingDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
    .filter((slug) => slug !== MAIN_LANDING_SLUG);
}

export function getLandingPage(slug: string): LandingPage | null {
  // Guards against a slug from the URL escaping the content directory. Every
  // real slug comes from generateStaticParams, but this is a public route and
  // the cost of being wrong is reading arbitrary files off the server.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  const filePath = path.join(landingDirectory, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  return { frontmatter: data as LandingFrontmatter, content, slug };
}
