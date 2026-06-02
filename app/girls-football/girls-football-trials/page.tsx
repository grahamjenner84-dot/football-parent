import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls Football Trials | Football Parent",
  description:
    "A parent-friendly guide to girls football trials, including what to expect, how to prepare and how academy pathways work.",
  path: "/girls-football/girls-football-trials",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-football-trials"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/girls-football-trials"
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