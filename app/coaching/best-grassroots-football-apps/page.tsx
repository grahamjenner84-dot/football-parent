import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "The Best Football Coaching Apps for Grassroots Coaches (2026) | Football Parent",
  description:
    "Football Parent Coach App for playing time and stats, FootballDNA for drills, Spond for payments: one coach's picks for the best grassroots football apps in 2026.",
  path: "/coaching/best-grassroots-football-apps",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "best-grassroots-football-apps"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/best-grassroots-football-apps"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
