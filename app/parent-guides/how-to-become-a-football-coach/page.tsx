import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Become a Football Coach: A Parent's Guide | Football Parent",
  description: "Thinking about coaching your child's grassroots football team? Here's exactly what qualifications, checks and time commitment are actually involved.",
  path: "/parent-guides/how-to-become-a-football-coach",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "how-to-become-a-football-coach"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/how-to-become-a-football-coach"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
