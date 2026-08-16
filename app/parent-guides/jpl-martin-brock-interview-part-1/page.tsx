import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "JPL Interview: Martin Brock on the Junior Premier League | Football Parent",
  description:
    "JPL chief executive Martin Brock on why the league was created, how it differs from grassroots football, and what trials, training and costs involve.",
  path: "/parent-guides/jpl-martin-brock-interview-part-1",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "jpl-martin-brock-interview-part-1"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/jpl-martin-brock-interview-part-1"
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
