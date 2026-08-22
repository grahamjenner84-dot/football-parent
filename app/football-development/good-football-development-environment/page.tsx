import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Good Football Development Environment | Football Parent",
  description:
    "Coaching quality, touches on the ball, playing time and enjoyment matter more than league position. What actually predicts whether a child is developing.",
  path: "/football-development/good-football-development-environment",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "good-football-development-environment"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/good-football-development-environment"
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