import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "What Age Do Girls Football Academies Recruit? | Football Parent",
  description:
    "Find out what age girls football academies usually recruit players, how pathways work and what parents should realistically expect.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/girls-football/what-age-do-girls-football-academies-recruit",
  },
  openGraph: {
    title: "What Age Do Girls Football Academies Recruit? | Football Parent",
    description:
      "Find out what age girls football academies usually recruit players, how pathways work and what parents should realistically expect.",
    url: "https://www.footballparent.co.uk/girls-football/what-age-do-girls-football-academies-recruit",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Age Do Girls Football Academies Recruit? | Football Parent",
    description:
      "Find out what age girls football academies usually recruit players, how pathways work and what parents should realistically expect.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "what-age-do-girls-football-academies-recruit"
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