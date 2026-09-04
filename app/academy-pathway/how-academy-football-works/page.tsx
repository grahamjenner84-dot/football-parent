import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Academy Football Works | Football Parent",
  description:
    "Academy football runs through three EPPP phases, Foundation, Youth Development and Professional Development, each with different stakes and training hours.",
  path: "/academy-pathway/how-academy-football-works",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-academy-football-works"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-academy-football-works"
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