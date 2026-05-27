import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is EPPP? | Football Parent",
  description:
    "A beginner's guide to the Elite Player Performance Plan (EPPP), how it changed youth football in England, and what it means for your child's development.",
  path: "/academy-pathway/what-is-eppp",
});

export default async function Page() {
  const article = getArticleBySlug("academy-pathway", "what-is-eppp");

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