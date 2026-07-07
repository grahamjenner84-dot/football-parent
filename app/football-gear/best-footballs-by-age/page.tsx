import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Sizes by Age: Best Footballs For Kids | Football Parent",
  description:
    "A UK parent guide to football sizes by age group, including what size football children use at U7, U8, U9, U10, U11, U12, U13, U14 and older age groups.",
  path: "/football-gear/best-footballs-by-age",
});

export default async function Page() {
  const article = getArticleBySlug("football-gear", "best-footballs-by-age");

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-gear/best-footballs-by-age"
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