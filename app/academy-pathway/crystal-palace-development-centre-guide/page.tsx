import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Crystal Palace Development Centre Guide | Football Parent",
  description:
    "Learn about the Crystal Palace Development Centre and how it supports young footballers in their development journey.",
  path: "/academy-pathway/crystal-palace-development-centre-guide copy",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "crystal-palace-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/crystal-palace-development-centre-guide"
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
