import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Premier League Development Centres | Football Parent",
  description:
    "Which Premier League clubs run development centres, and what do they actually involve? How club pathways differ, and what families should understand before pursuing an opportunity.",
  path: "/academy-pathway/premier-league-development-centres-list",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "premier-league-development-centres-list"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/premier-league-development-centres-list"
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