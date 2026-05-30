import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Premier League Development Centres List | Football Parent",
  description:
    "A comprehensive list of Premier League development centres and how they support young footballers.",
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
