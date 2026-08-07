import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Girls Academy or Grassroots Football? | Football Parent",
  description:
    "Comparing girls academy football and grassroots football environments, commitments and development opportunities.",
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
      datePublished={article.frontmatter.date}
      path="/girls-football/girls-academy-vs-grassroots-football"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}