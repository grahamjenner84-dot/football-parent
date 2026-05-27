import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Best Shin Pads for Kids Football | Football Parent",
  description:
    "A practical guide to choosing shin pads for kids football, including fit, comfort, protection and what parents should check before buying.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-gear/shin-pads/best-shin-pads-for-kids-football",
  },
  openGraph: {
    title: "Best Shin Pads for Kids Football | Football Parent",
    description:
      "A practical guide to choosing shin pads for kids football, including fit, comfort, protection and what parents should check before buying.",
    url: "https://www.footballparent.co.uk/football-gear/shin-pads/best-shin-pads-for-kids-football",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Shin Pads for Kids Football | Football Parent",
    description:
      "A practical guide to choosing shin pads for kids football, including fit, comfort, protection and what parents should check before buying.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-shin-pads-for-kids-football"
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