import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Build Confidence in Young Footballers | Football Parent",
  description:
    "Practical ways parents can help young footballers build confidence, recover from mistakes and enjoy their development.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/build-confidence-young-footballers",
  },
  openGraph: {
    title: "Build Confidence in Young Footballers | Football Parent",
    description:
      "Practical ways parents can help young footballers build confidence, recover from mistakes and enjoy their development.",
    url: "https://www.footballparent.co.uk/football-development/build-confidence-young-footballers",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build Confidence in Young Footballers | Football Parent",
    description:
      "Practical ways parents can help young footballers build confidence, recover from mistakes and enjoy their development.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "build-confidence-young-footballers"
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