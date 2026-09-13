import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Boots for Kids (2026 Buying Guide) | Football Parent",
  description:
    "Kids' football boots split into FG, AG and SG soles, and the wrong one for the pitch causes real discomfort. Fit, budget and age-by-age buying guidance.",
  path: "/football-gear/best-football-boots-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug("football-gear", "best-football-boots-for-kids");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-boots-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
