import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Boots for Wide Feet Kids | Football Parent",
  description:
    "A parent-friendly guide to choosing comfortable football boots for children with wide feet, including fit, comfort and surface advice.",
  path: "/football-gear/boots/best-football-boots-for-wide-feet-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-boots-for-wide-feet-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
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