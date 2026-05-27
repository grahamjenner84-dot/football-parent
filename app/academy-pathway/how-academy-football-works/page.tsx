import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "How Academy Football Works | Football Parent",
  description:
    "A clear guide to how academy football works in the UK, including age groups, training, fixtures and what parents should expect.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-pathway/how-academy-football-works",
  },
  openGraph: {
    title: "How Academy Football Works | Football Parent",
    description:
      "A clear guide to how academy football works in the UK, including age groups, training, fixtures and what parents should expect.",
    url: "https://www.footballparent.co.uk/academy-pathway/how-academy-football-works",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Academy Football Works | Football Parent",
    description:
      "A clear guide to how academy football works in the UK, including age groups, training, fixtures and what parents should expect.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-academy-football-works"
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