import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Understanding Academy Release In Football | Football Parent",
  description:
    "An honest guide for football parents on academy release — what it means, how clubs handle it, and how to support young players emotionally after being released.",
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "understanding-academy-release"
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