import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Category 1, 2 and 3 Academies List 2026/27: Every Club | Football Parent",
  description: "All 31 Category 1 academies for 2026/27, the 17 Category 2 clubs and Category 3 and 4 list, plus this summer's changes at Bournemouth, Brentford and Watford.",
  path: "/academy-pathway/football-academies-by-category-list",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "football-academies-by-category-list"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/football-academies-by-category-list"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
