import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "West Ham Player Pathway Guide | Football Parent",
  description:
    "A comprehensive guide to understanding the West Ham United player pathway and how young players can progress through the academy system.",
  path: "/academy-pathway/west-ham-player-pathway-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "west-ham-player-pathway-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/west-ham-player-pathway-guide"
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
