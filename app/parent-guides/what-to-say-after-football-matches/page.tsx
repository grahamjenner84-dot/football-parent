import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What NOT to Say After Football Matches | Football Parent",
  description:
    "What to actually say to your child after a football match, win or lose: the phrases that help, the ones that do harm, and why the drive home matters most.",
  path: "/parent-guides/what-to-say-after-football-matches",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "what-to-say-after-football-matches"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/what-to-say-after-football-matches"
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