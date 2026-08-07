import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Gloves for Winter Training | Football Parent",
  description:
    "Choosing football gloves for winter training: what to look for, what to avoid, and which types work best for younger players in cold and wet conditions.",
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
      content={article.content}
   
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}