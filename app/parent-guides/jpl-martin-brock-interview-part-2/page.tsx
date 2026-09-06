import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Martin Brock on the JPL Part 2 | Football Parent",
  description:
    "JPL chief executive Martin Brock on development vs results, whether the JPL leads to scouts and academies, common parent misconceptions, and matchday conduct.",
  path: "/parent-guides/jpl-martin-brock-interview-part-2",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "jpl-martin-brock-interview-part-2"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/jpl-martin-brock-interview-part-2"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
