import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";

export const metadata = {
  title: "Best Football Gloves for Winter Training | Football Parent",
  description:
    "A practical guide to choosing warm football gloves for winter training, including what parents should look for when buying for children.",
  alternates: {
    canonical:
      "https://www.footballparent.co.uk/football-gear/best-football-gloves-for-winter-training",
  },
  openGraph: {
    title: "Best Football Gloves for Winter Training | Football Parent",
    description:
      "A practical guide to choosing warm football gloves for winter training, including what parents should look for when buying for children.",
    url: "https://www.footballparent.co.uk/football-gear/best-football-gloves-for-winter-training",
    siteName: "Football Parent",
    locale: "en_GB",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Football Gloves for Winter Training | Football Parent",
    description:
      "A practical guide to choosing warm football gloves for winter training, including what parents should look for when buying for children.",
  },
};

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-gloves-for-winter-training"
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