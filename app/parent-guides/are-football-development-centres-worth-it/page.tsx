import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Are Football Development Centres Worth It? | Football Parent",
  description:
    "Discover whether football development centres are a worthwhile investment for your child's football journey.",
  path: "/parent-guides/are-football-development-centres-worth-it",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "are-football-development-centres-worth-it"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/are-football-development-centres-worth-it"
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