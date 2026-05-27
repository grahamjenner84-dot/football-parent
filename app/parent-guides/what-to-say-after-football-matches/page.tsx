import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "What to Say After Football Matches | Football Parent",
  description:
    "Practical advice for football parents on what to say after matches, helping young players feel supported and confident.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/parent-guides/what-to-say-after-football-matches",
  },
  openGraph: {
    title: "What to Say After Football Matches | Football Parent",
    description:
      "Practical advice for football parents on what to say after matches, helping young players feel supported and confident.",
    url: "https://www.footballparent.co.uk/parent-guides/what-to-say-after-football-matches",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What to Say After Football Matches | Football Parent",
    description:
      "Practical advice for football parents on what to say after matches, helping young players feel supported and confident.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "what-to-say-after-football-matches"
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