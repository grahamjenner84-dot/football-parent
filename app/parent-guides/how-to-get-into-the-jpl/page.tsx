import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Get Into the JPL | Football Parent",
  description:
    "Learn how your child can get into the Junior Premier League and what it takes to succeed.",
  path: "/parent-guides/how-to-get-into-the-jpl",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "how-to-get-into-the-jpl"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/how-to-get-into-the-jpl"
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