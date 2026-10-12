import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Scouting: Chris Robinson on Trials, Scout Approaches and Agents | Football Parent",
  description: "Southampton academy recruitment head and ex-Chelsea scout Chris Robinson on what scouts notice, how trials really work, spotting genuine scouts, and agents.",
  path: "/parent-guides/chris-robinson-football-scout-interview",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "chris-robinson-football-scout-interview"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/chris-robinson-football-scout-interview"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
