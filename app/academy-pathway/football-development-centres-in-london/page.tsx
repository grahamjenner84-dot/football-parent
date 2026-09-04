import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development Centres in London | Football Parent",
  description:
    "London has more youth football development pathways than anywhere else in England - the options for both boys and girls across the capital.",
  path: "/academy-pathway/football-development-centres-in-london",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "football-development-centres-in-london"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/football-development-centres-in-london"
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
