import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Become a Professional Footballer | Football Parent",
  description:
    "A realistic guide to becoming a professional footballer, including development pathways, academy football and long-term progression.",
  path: "/football-development/how-to-become-a-professional-footballer",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "how-to-become-a-professional-footballer"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}