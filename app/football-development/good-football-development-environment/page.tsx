import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Good Football Development Environment | Football Parent",
  description:
    "Learn what makes a good football development environment for young players, including coaching, culture and long-term support.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/good-football-development-environment",
  },
  openGraph: {
    title: "Good Football Development Environment | Football Parent",
    description:
      "Learn what makes a good football development environment for young players, including coaching, culture and long-term support.",
    url: "https://www.footballparent.co.uk/football-development/good-football-development-environment",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Good Football Development Environment | Football Parent",
    description:
      "Learn what makes a good football development environment for young players, including coaching, culture and long-term support.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "good-football-development-environment"
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