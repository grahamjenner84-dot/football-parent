import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Do Academy Coaches Look For? | Football Parent",
  description:
    "Understand the technical, physical and psychological qualities academy coaches look for in young footballers.",
  path: "/academy-trials/what-do-academy-coaches-look-for",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "what-do-academy-coaches-look-for"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/what-do-academy-coaches-look-for"
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