import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Boots for Girls (2026): Fit and Sizing",
  description: "Most girls' football boots are the same junior boots boys wear. Which ones are built on a female-specific fit, how sizing works, and which sole to buy.",
  path: "/football-gear/best-football-boots-for-girls",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-boots-for-girls"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-boots-for-girls"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
