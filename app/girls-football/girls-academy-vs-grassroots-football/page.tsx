import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls Academy vs Grassroots Football | Football Parent",
  description:
    "Compare girls academy football and grassroots football, including development environment, commitment and player experience.",
  path: "/girls-football/girls-academy-vs-grassroots-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "girls-academy-vs-grassroots-football"
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