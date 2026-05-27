import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "How Much Football Training Is Too Much? | Football Parent",
  description:
    "Understand how much football training may be too much for young players and how parents can balance development, recovery and enjoyment.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/how-much-training-is-too-much",
  },
  openGraph: {
    title: "How Much Football Training Is Too Much? | Football Parent",
    description:
      "Understand how much football training may be too much for young players and how parents can balance development, recovery and enjoyment.",
    url: "https://www.footballparent.co.uk/football-development/how-much-training-is-too-much",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Much Football Training Is Too Much? | Football Parent",
    description:
      "Understand how much football training may be too much for young players and how parents can balance development, recovery and enjoyment.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "how-much-training-is-too-much"
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