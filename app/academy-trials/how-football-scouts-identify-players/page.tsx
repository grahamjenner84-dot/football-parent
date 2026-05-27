import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "How Football Scouts Identify Players | Football Parent",
  description:
    "Learn what football scouts actually look for in young players, from technical ability to decision making and attitude.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/academy-trials/how-football-scouts-identify-players",
  },
  openGraph: {
    title: "How Football Scouts Identify Players | Football Parent",
    description:
      "Learn what football scouts actually look for in young players, from technical ability to decision making and attitude.",
    url: "https://www.footballparent.co.uk/academy-trials/how-football-scouts-identify-players",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Football Scouts Identify Players | Football Parent",
    description:
      "Learn what football scouts actually look for in young players, from technical ability to decision making and attitude.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "how-football-scouts-identify-players"
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