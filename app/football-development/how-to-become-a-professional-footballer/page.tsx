import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title:
    "How to Become a Professional Footballer | Football Parent",
  description:
    "A realistic guide to becoming a professional footballer, including development pathways, academy football and long-term progression.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/how-to-become-a-professional-footballer",
  },
  openGraph: {
    title:
      "How to Become a Professional Footballer | Football Parent",
    description:
      "A realistic guide to becoming a professional footballer, including development pathways, academy football and long-term progression.",
    url: "https://www.footballparent.co.uk/football-development/how-to-become-a-professional-footballer",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "How to Become a Professional Footballer | Football Parent",
    description:
      "A realistic guide to becoming a professional footballer, including development pathways, academy football and long-term progression.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "how-to-become-a-professional-footballer"
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