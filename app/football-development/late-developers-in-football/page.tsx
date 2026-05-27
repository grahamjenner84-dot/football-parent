import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Late Developers in Football | Football Parent",
  description:
    "Why late developers in football can still progress, and how parents can support young players who develop at different speeds.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-development/late-developers-in-football",
  },
  openGraph: {
    title: "Late Developers in Football | Football Parent",
    description:
      "Why late developers in football can still progress, and how parents can support young players who develop at different speeds.",
    url: "https://www.footballparent.co.uk/football-development/late-developers-in-football",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Late Developers in Football | Football Parent",
    description:
      "Why late developers in football can still progress, and how parents can support young players who develop at different speeds.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "late-developers-in-football"
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