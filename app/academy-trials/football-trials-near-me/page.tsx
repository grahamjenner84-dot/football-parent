import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Trials Near Me | Football Parent",
  description:
    "How to find legitimate football trials in the UK, what to avoid, and what parents should realistically expect from academy opportunities.",
  path: "/academy-trials/football-trials-near-me",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "football-trials-near-me"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
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