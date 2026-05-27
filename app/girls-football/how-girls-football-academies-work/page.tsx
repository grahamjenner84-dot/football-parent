import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "How Girls Football Academies Work | Football Parent",
  description:
    "Understand how girls football academies work in the UK, including pathways, trials, development and what parents should expect.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/girls-football/how-girls-football-academies-work",
  },
  openGraph: {
    title: "How Girls Football Academies Work | Football Parent",
    description:
      "Understand how girls football academies work in the UK, including pathways, trials, development and what parents should expect.",
    url: "https://www.footballparent.co.uk/girls-football/how-girls-football-academies-work",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Girls Football Academies Work | Football Parent",
    description:
      "Understand how girls football academies work in the UK, including pathways, trials, development and what parents should expect.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "how-girls-football-academies-work"
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