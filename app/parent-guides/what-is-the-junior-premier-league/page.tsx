import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What is the Junior Premier League? | Football Parent",
  description:
    "Learn all about the Junior Premier League and how it can benefit your child's football development.",
  path: "/parent-guides/what-is-the-junior-premier-league",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "what-is-the-junior-premier-league"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/what-is-the-junior-premier-league"
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