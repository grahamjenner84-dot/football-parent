import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Improve Football Decision Making | Football Parent",
  description:
    "Help young footballers improve decision making, awareness and game understanding with practical parent-friendly advice.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/improve-football-decision-making",
  },
  openGraph: {
    title: "Improve Football Decision Making | Football Parent",
    description:
      "Help young footballers improve decision making, awareness and game understanding with practical parent-friendly advice.",
    url: "https://www.footballparent.co.uk/football-development/improve-football-decision-making",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Improve Football Decision Making | Football Parent",
    description:
      "Help young footballers improve decision making, awareness and game understanding with practical parent-friendly advice.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "improve-football-decision-making"
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