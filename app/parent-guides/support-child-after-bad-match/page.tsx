import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Support Your Child After a Bad Match | Football Parent",
  description:
    "Learn how to support a young footballer after a bad match with calm, practical and confidence-building parent advice.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/parent-guides/support-child-after-bad-match",
  },
  openGraph: {
    title: "Support Your Child After a Bad Match | Football Parent",
    description:
      "Learn how to support a young footballer after a bad match with calm, practical and confidence-building parent advice.",
    url: "https://www.footballparent.co.uk/parent-guides/support-child-after-bad-match",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Support Your Child After a Bad Match | Football Parent",
    description:
      "Learn how to support a young footballer after a bad match with calm, practical and confidence-building parent advice.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "support-child-after-bad-match"
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