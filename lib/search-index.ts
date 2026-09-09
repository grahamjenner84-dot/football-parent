import { getAllArticles } from "@/lib/content";

export interface SearchIndexEntry {
  title: string;
  description: string;
  category: string;
  url: string;
}

export function getSearchIndex(): SearchIndexEntry[] {
  // getAllArticles() walks every content/ subdirectory, including
  // content/landing/ - Coach App ad landing pages that use a different
  // frontmatter shape (h1/seoTitle/seoDescription, no title/category) and
  // are marked index: false. Skip anything missing the article fields so
  // the site search index (and searchArticles()'s unconditional
  // .toLowerCase() calls) never sees an undefined field.
  return getAllArticles()
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
}
