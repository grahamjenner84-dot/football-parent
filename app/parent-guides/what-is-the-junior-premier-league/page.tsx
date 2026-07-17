import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is the Junior Premier League (JPL)? | Football Parent",
  description:
  "An independent guide to the Junior Premier League (JPL): who runs it, how it works, age groups, costs, and whether it's connected to the Premier League.",
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