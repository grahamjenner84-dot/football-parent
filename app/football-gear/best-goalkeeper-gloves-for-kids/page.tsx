import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Goalkeeper Gloves for Kids: Sizes, 3G Wear and Picks | Football Parent",
  description: "Kids' goalkeeper gloves run from size 3 to 7, but brands disagree by a full size at the same age. How to measure, which palm lasts on 3G, and 4 picks from £9.",
  path: "/football-gear/best-goalkeeper-gloves-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-goalkeeper-gloves-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-goalkeeper-gloves-for-kids"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
