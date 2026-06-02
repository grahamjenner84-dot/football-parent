import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What to Say After Football Matches | Football Parent",
  description:
    "Learn what parents should say after football matches to help young players build confidence, resilience and enjoyment.",
  path: "/parent-guides/what-to-say-after-football-matches",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "what-to-say-after-football-matches"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/what-to-say-after-football-matches"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}