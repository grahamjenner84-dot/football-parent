import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Should You Leave Grassroots Football for an Academy? | Football Parent",
  description:
    "Should your child leave grassroots football for an academy? Compare the coaching, commitment, pressure, travel and development benefits before deciding.",
  path: "/parent-guides/leave-grassroots-football-for-an-academy",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "leave-grassroots-football-for-an-academy"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/leave-grassroots-football-for-an-academy"
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