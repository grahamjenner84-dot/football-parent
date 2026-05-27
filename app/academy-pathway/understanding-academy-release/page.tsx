import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Understanding Academy Release | Football Parent",
  description:
    "Practical guidance for parents on academy release, what it means and how to support a young player after being released.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-pathway/understanding-academy-release",
  },
  openGraph: {
    title: "Understanding Academy Release | Football Parent",
    description:
      "Practical guidance for parents on academy release, what it means and how to support a young player after being released.",
    url: "https://www.footballparent.co.uk/academy-pathway/understanding-academy-release",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Understanding Academy Release | Football Parent",
    description:
      "Practical guidance for parents on academy release, what it means and how to support a young player after being released.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "understanding-academy-release"
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