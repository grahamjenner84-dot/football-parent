import { getAllArticles } from "@/lib/content";
import { getLandingPage, MAIN_LANDING_SLUG } from "@/lib/landing";

export interface SearchIndexEntry {
  title: string;
  description: string;
  category: string;
  url: string;
}

// The Coach App's own indexable page (/football-parent-coach-app) is content
// from content/landing/main.mdx, not content/ - see the filter below. Pulled
// in here explicitly, by name, rather than by loosening that filter, so the
// noindex ad variants stay out of site search the same way they stay out of
// Google.
function getCoachAppEntry(): SearchIndexEntry | null {
  const page = getLandingPage(MAIN_LANDING_SLUG);
  if (!page) return null;
  return {
    title: page.frontmatter.h1,
    description: page.frontmatter.seoDescription ?? page.frontmatter.subhead,
    category: "Coach App",
    url: "/football-parent-coach-app",
  };
}

export function getSearchIndex(): SearchIndexEntry[] {
  // getAllArticles() walks every content/ subdirectory, including
  // content/landing/ - Coach App ad landing pages that use a different
  // frontmatter shape (h1/seoTitle/seoDescription, no title/category) and
  // are marked index: false. Skip anything missing the article fields so
  // the site search index (and searchArticles()'s unconditional
  // .toLowerCase() calls) never sees an undefined field.
  const articles = getAllArticles()
    .filter(
      (article) =>
        article.frontmatter.title &&
        article.frontmatter.description &&
        article.frontmatter.category &&
        article.frontmatter.categoryUrl
    )
    .map((article) => ({
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      category: article.frontmatter.category,
      url: `${article.frontmatter.categoryUrl}/${article.slug}`,
    }));

  const coachApp = getCoachAppEntry();
  return coachApp ? [coachApp, ...articles] : articles;
}
