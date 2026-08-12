import { getAllArticles } from "@/lib/content";

export interface SearchIndexEntry {
  title: string;
  description: string;
  category: string;
  url: string;
}

export function getSearchIndex(): SearchIndexEntry[] {
  return getAllArticles().map((article) => ({
    title: article.frontmatter.title,
    description: article.frontmatter.description,
    category: article.frontmatter.category,
    url: `${article.frontmatter.categoryUrl}/${article.slug}`,
  }));
}
