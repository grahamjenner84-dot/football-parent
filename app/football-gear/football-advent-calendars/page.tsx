import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Advent Calendars 2026: The Best for Kids",
  description:
    "Match Attax 2026/27, Topps Premier League and Adrenalyn XL card calendars, plus story books and brick builds: what's behind the 24 doors and which age each suits.",
  path: "/football-gear/football-advent-calendars",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "football-advent-calendars"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/football-advent-calendars"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
