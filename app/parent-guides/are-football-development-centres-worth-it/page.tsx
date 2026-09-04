import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Are Football Development Centres Worth It? | Football Parent",
  description:
    "A development centre is worth it when coaching is structured and your child enjoys it, not when cost or logistics create strain. Red flags to check first.",
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
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}