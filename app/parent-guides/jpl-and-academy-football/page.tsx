import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Does the Junior Premier League Lead to Academy Football? | Football Parent",
  description:
    "Explore the relationship between the Junior Premier League and academy football to understand how they can complement each other in your child's development.",
  path: "/parent-guides/jpl-and-academy-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "jpl-and-academy-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/jpl-and-academy-football"
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