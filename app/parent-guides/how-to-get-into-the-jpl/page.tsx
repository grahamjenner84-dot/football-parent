import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "JPL Trials: How to Get Into the JPL | Football Parent",
  description:
    "Learn how JPL trials work, how to join a Junior Premier League club, what coaches look for, typical costs and what parents should expect from the recruitment process.",
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