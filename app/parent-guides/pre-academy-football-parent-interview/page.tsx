import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Pre-Academy Football: A Parent on Scouts and Signing",
  description: "The parent behind The Pre Academy Player on a Category 1 scout at an U6 festival, weekly training, little feedback, release, and signing for a club that suits him.",
  path: "/parent-guides/pre-academy-football-parent-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "pre-academy-football-parent-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/pre-academy-football-parent-interview"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
