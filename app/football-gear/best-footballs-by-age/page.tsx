import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Best Footballs by Age | Football Parent",
  description:
    "Choose the right football size by age, including guidance for young players, training sessions and match use.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-gear/best-footballs-by-age",
  },
  openGraph: {
    title: "Best Footballs by Age | Football Parent",
    description:
      "Choose the right football size by age, including guidance for young players, training sessions and match use.",
    url: "https://www.footballparent.co.uk/football-gear/best-footballs-by-age",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Footballs by Age | Football Parent",
    description:
      "Choose the right football size by age, including guidance for young players, training sessions and match use.",
  },
};

export default async function Page() {
  const article = getArticleBySlug("football-gear", "best-footballs-by-age");

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