import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "How To Build Confidence In Young Footballers | Football Parent",
  description: "Strategies for building and maintaining confidence in young football players.",
};

export default async function Page() {
  const article = getArticleBySlug("football-development", "build-confidence-young-footballers");

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
