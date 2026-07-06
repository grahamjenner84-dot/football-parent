import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is Pre-Academy Football? | Football Parent",
  description: "What is pre-academy football, what ages does it cover, and is it worth it? A clear guide to pre-academies, trials and how they relate to academy football.",
  path: "/academy-pathway/pre-academy-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "pre-academy-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/academy-pathway/pre-academy-football"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
