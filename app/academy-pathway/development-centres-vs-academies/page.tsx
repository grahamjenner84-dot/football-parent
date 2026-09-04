import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Development Centres vs Academies | Football Parent",
  description:
    "What's the difference between a football development centre and a professional academy, and what each means for a family navigating the youth football pathway.",
  path: "/academy-pathway/development-centres-vs-academies",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "development-centres-vs-academies"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/development-centres-vs-academies"
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