import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Young Footballer Mindset: Matt Baxter on Confidence, Bad Games and Burnout | Football Parent",
  description: "Mindset coach Matt Baxter on the first ten minutes after a bad game, where real confidence comes from, spotting burnout, talk of quitting, and pressure that backfires.",
  path: "/parent-guides/matt-baxter-young-footballer-mindset-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "matt-baxter-young-footballer-mindset-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/matt-baxter-young-footballer-mindset-interview"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
