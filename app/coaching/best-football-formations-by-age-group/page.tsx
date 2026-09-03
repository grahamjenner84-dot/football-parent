import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Formations by Age Group | Football Parent",
  description:
    "7v7 now starts at U10 and 9v9 at U12 under the FA's 2026/27 format changes, not the old U9/U11 split. Suggested formations and rules for both explained.",
  path: "/coaching/best-football-formations-by-age-group",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "best-football-formations-by-age-group"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/best-football-formations-by-age-group"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
