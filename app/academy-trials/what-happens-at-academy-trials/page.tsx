import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "What Happens at Academy Trials? | Football Parent",
  description:
    "A parent-friendly guide to what happens at football academy trials, including drills, matches and what young players should expect.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-trials/what-happens-at-academy-trials",
  },
  openGraph: {
    title: "What Happens at Academy Trials? | Football Parent",
    description:
      "A parent-friendly guide to what happens at football academy trials, including drills, matches and what young players should expect.",
    url: "https://www.footballparent.co.uk/academy-trials/what-happens-at-academy-trials",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Happens at Academy Trials? | Football Parent",
    description:
      "A parent-friendly guide to what happens at football academy trials, including drills, matches and what young players should expect.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "what-happens-at-academy-trials"
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