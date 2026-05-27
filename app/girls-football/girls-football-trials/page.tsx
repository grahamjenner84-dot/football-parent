import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Girls Football Trials | Football Parent",
  description:
    "A parent-friendly guide to girls football trials, including what to expect, how to prepare and how academy pathways work.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/girls-football/girls-football-trials",
  },
  openGraph: {
    title: "Girls Football Trials | Football Parent",
    description:
      "A parent-friendly guide to girls football trials, including what to expect, how to prepare and how academy pathways work.",
    url: "https://www.footballparent.co.uk/girls-football/girls-football-trials",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Girls Football Trials | Football Parent",
    description:
      "A parent-friendly guide to girls football trials, including what to expect, how to prepare and how academy pathways work.",
  },
};

export default async function Page() {
  const article = getArticleBySlug("girls-football", "girls-football-trials");

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