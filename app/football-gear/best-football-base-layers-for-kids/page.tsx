import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Skins for Kids: The Best Base Layers for Winter Football | Football Parent",
  description: "In matches, kids' football skins must match the shirt sleeve colour. Skins vs thermals, sizing, leggings and snoods, plus base layer picks for winter.",
  path: "/football-gear/best-football-base-layers-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-base-layers-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-base-layers-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
