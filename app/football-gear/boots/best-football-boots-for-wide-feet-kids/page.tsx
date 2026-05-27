import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Best Football Boots for Wide Feet Kids | Football Parent",
  description:
    "A parent-friendly guide to choosing comfortable football boots for children with wide feet, including fit, comfort and surface advice.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-gear/boots/best-football-boots-for-wide-feet-kids",
  },
  openGraph: {
    title: "Best Football Boots for Wide Feet Kids | Football Parent",
    description:
      "A parent-friendly guide to choosing comfortable football boots for children with wide feet, including fit, comfort and surface advice.",
    url: "https://www.footballparent.co.uk/football-gear/boots/best-football-boots-for-wide-feet-kids",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Football Boots for Wide Feet Kids | Football Parent",
    description:
      "A parent-friendly guide to choosing comfortable football boots for children with wide feet, including fit, comfort and surface advice.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-boots-for-wide-feet-kids"
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