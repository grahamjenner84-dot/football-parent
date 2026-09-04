import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Is Private Football Coaching Worth It? | Football Parent",
  description:
    "Thinking about private 1-to-1 football coaching? When it helps, what it costs, how to choose a coach, and whether it's worth it for young players.",
  path: "/football-development/is-private-football-coaching-worth-it",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "is-private-football-coaching-worth-it"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/is-private-football-coaching-worth-it"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}