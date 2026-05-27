import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Late Developers in Girls Football | Football Parent",
  description:
    "Why late developers in girls football can still progress, and how parents can support confidence, patience and long-term development.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/girls-football/late-developers-in-girls-football",
  },
  openGraph: {
    title: "Late Developers in Girls Football | Football Parent",
    description:
      "Why late developers in girls football can still progress, and how parents can support confidence, patience and long-term development.",
    url: "https://www.footballparent.co.uk/girls-football/late-developers-in-girls-football",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Late Developers in Girls Football | Football Parent",
    description:
      "Why late developers in girls football can still progress, and how parents can support confidence, patience and long-term development.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "late-developers-in-girls-football"
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