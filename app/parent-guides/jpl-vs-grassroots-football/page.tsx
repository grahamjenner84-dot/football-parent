import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "JPL vs. Grassroots Football | Football Parent",
  description:
    "Compare the Junior Premier League with traditional grassroots football to understand the differences and benefits for your child.",
  path: "/parent-guides/jpl-vs-grassroots-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "jpl-vs-grassroots-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/jpl-vs-grassroots-football"
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