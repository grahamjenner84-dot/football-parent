import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "AG vs FG Football Boots Explained | Football Parent",
  description:
    "Understand the difference between AG and FG football boots, which surfaces they are designed for, and what parents should know before buying.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/football-gear/ag-vs-fg-boots",
  },
  openGraph: {
    title: "AG vs FG Football Boots Explained | Football Parent",
    description:
      "Understand the difference between AG and FG football boots, which surfaces they are designed for, and what parents should know before buying.",
    url: "https://www.footballparent.co.uk/football-gear/ag-vs-fg-boots",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AG vs FG Football Boots Explained | Football Parent",
    description:
      "Understand the difference between AG and FG football boots, which surfaces they are designed for, and what parents should know before buying.",
  },
};

export default async function Page() {
  const article = getArticleBySlug("football-gear", "ag-vs-fg-boots");

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