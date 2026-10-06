import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Getting Your Daughter Into Football: Girls United on Confidence, Clubs and Barriers | Football Parent",
  description: "Girls United on getting your daughter into football: what has changed for girls, the barriers parents miss, building a nervous player's confidence, choosing a club.",
  path: "/girls-football/girls-united-daughter-football-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-united-daughter-football-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/girls-football/girls-united-daughter-football-interview"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
