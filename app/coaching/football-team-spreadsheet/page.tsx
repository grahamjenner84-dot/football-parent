import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Team Spreadsheet: Tracking Goals, Assists and Playing Time | Football Parent",
  description:
    "A football team spreadsheet for tracking goals, assists and playing time by quarter, and when it's worth switching to an app instead.",
  path: "/coaching/football-team-spreadsheet",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "football-team-spreadsheet"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/football-team-spreadsheet"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
