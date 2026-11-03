import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Trials: David Jervis on What Coaches Notice",
  description: "Premier Football UK founder David Jervis on what coaches notice at trials, the mistakes that cost a second look, how scholarships work and routes in after 15.",
  path: "/parent-guides/david-jervis-football-trials-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "david-jervis-football-trials-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/david-jervis-football-trials-interview"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
