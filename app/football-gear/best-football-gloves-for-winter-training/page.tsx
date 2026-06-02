import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Gloves for Winter Training | Football Parent",
  description:
    "A practical guide to choosing warm football gloves for winter training, including what parents should look for when buying for children.",
  path: "/football-gear/best-football-gloves-for-winter-training",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-gloves-for-winter-training"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-gear/best-football-gloves-for-winter-training"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
   
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}