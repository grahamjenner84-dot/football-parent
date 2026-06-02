import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Happens at Academy Trials? | Football Parent",
  description:
    "A parent-friendly guide to what happens at football academy trials, including drills, matches and what young players should expect.",
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
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}