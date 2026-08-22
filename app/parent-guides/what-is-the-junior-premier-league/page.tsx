import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is the Junior Premier League (JPL)? | Football Parent",
  description:
  "The Junior Premier League (JPL): who runs it, the age groups and clubs involved, typical costs, travel demands, and the standard of football to expect.",
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
      content={article.content}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}