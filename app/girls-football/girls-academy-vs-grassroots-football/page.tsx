import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Girls Academy vs Grassroots Football | Football Parent",
  description:
    "Compare girls academy football and grassroots football, including development environment, commitment, pressure and parent considerations.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/girls-football/girls-academy-vs-grassroots-football",
  },
  openGraph: {
    title: "Girls Academy vs Grassroots Football | Football Parent",
    description:
      "Compare girls academy football and grassroots football, including development environment, commitment, pressure and parent considerations.",
    url: "https://www.footballparent.co.uk/girls-football/girls-academy-vs-grassroots-football",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Girls Academy vs Grassroots Football | Football Parent",
    description:
      "Compare girls academy football and grassroots football, including development environment, commitment, pressure and parent considerations.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-academy-vs-grassroots-football"
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