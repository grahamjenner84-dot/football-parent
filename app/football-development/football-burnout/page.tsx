import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Burnout in Young Footballers | Football Parent",
  description:
    "How to recognise football burnout in young players, how it differs from a normal bad patch, and the changes that help a child rediscover enjoyment.",
  path: "/football-development/football-burnout",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "football-burnout"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      path="/football-development/football-burnout"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
