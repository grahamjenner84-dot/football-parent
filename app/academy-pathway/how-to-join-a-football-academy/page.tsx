import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Join a Football Academy | Football Parent",
  description:
    "Learn how to join a football academy, how to get into academy football, how clubs recruit young players and what parents can realistically do to improve their child's chances.",
  path: "/academy-pathway/how-to-join-a-football-academy",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-to-join-a-football-academy"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-to-join-a-football-academy"
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