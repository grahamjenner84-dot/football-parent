import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football Stats Apps for Kids and Grassroots Players (2026) | Football Parent",
  description: "Progress for one child's career stats, the Coach App for a whole team, a match log book for no screens at all: the best football stats apps and trackers for kids.", // must be word-for-word identical to the mdx frontmatter description
  path: "/parent-guides/best-football-stats-apps",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "best-football-stats-apps"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/best-football-stats-apps"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
