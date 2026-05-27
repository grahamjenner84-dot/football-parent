import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Football Trials Near Me | Football Parent",
  description:
    "How to find legitimate football trials in the UK, what to avoid, and what parents should realistically expect from academy opportunities.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-trials/football-trials-near-me",
  },
  openGraph: {
    title: "Football Trials Near Me | Football Parent",
    description:
      "How to find legitimate football trials in the UK, what to avoid, and what parents should realistically expect from academy opportunities.",
    url: "https://www.footballparent.co.uk/academy-trials/football-trials-near-me",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Football Trials Near Me | Football Parent",
    description:
      "How to find legitimate football trials in the UK, what to avoid, and what parents should realistically expect from academy opportunities.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "football-trials-near-me"
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