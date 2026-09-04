import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Boots for Wide Feet Kids | Football Parent",
  description:
    "Choosing comfortable football boots for children with wider feet: fit, sizing and what to check before buying.",
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
      datePublished={article.frontmatter.date}
      path="/football-gear/boots/best-football-boots-for-wide-feet-kids"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}