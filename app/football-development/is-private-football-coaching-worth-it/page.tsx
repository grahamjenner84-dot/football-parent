import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Is Private Football Coaching Worth It? | Football Parent",
  description:
    "An honest guide to private football coaching for children, including benefits, drawbacks and when it may be worth considering.",
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
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      relatedArticles={article.frontmatter.relatedArticles}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}