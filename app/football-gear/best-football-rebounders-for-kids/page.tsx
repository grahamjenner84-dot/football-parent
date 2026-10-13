import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Rebounders for Kids: Rebound Boards vs Nets",
  description:
    "Football rebounders for kids: rebound boards vs net rebounders, which suits your child's age and garden, and how to anchor one on grass, 3G or a patio.",
  path: "/football-gear/best-football-rebounders-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-rebounders-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-rebounders-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
