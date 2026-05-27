import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "What Is EPPP? | Football Parent",
  description:
    "A beginner's guide to the Elite Player Performance Plan (EPPP), how it changed youth football in England, and what it means for your child's development.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/academy-pathway/what-is-eppp",
  },
  openGraph: {
    title: "What Is EPPP? | Football Parent",
    description:
      "A beginner's guide to the Elite Player Performance Plan (EPPP), how it changed youth football in England, and what it means for your child's development.",
    url: "https://www.footballparent.co.uk/academy-pathway/what-is-eppp",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is EPPP? | Football Parent",
    description:
      "A beginner's guide to the Elite Player Performance Plan (EPPP), how it changed youth football in England, and what it means for your child's development.",
  },
};

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