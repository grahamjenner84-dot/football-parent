import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Goals for the Garden (2026 Kids' Buying Guide) | Football Parent",
  description:
    "Football goals for the garden: FA-sized for 3v3 to 9v9, how to anchor one safely, and pop-up versus folding goals that survive a full season of practice.",
  path: "/football-gear/best-football-goals-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-goals-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-goals-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
