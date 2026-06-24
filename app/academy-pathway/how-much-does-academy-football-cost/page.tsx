import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Much Does Academy Football Cost? | Football Parent",
  description:
    "Learn about the costs associated with academy football and what parents need to know.",
  path: "/academy-pathway/how-much-does-academy-football-cost",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-much-does-academy-football-cost"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/how-much-does-academy-football-cost"
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
