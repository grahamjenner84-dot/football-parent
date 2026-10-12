import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Gifts for Kids (2026 Christmas Guide by Age and Budget) | Football Parent",
  description:
    "Football gifts for kids by age and budget: a size 3 ball until Under 11, a garden goal that fits, and why boots make a risky Christmas present mid-season.",
  path: "/football-gear/christmas-football-gifts-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "christmas-football-gifts-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/christmas-football-gifts-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}
