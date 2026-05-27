import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Development Centres vs Academies | Football Parent",
  description:
    "Learn the difference between football development centres and academies, and what each option means for young players.",
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