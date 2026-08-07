import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Happens at Academy Trials? | Football Parent",
  description:
    "What to expect on the day of a football academy trial, and how to prepare a child for trial at an academy or development centre.",
  path: "/academy-trials/what-happens-at-academy-trials",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "what-happens-at-academy-trials"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/what-happens-at-academy-trials"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}