import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Shin Pads for Kids Football | Football Parent",
  description:
    "A practical guide to choosing shin pads for kids football, including fit, comfort, protection and what parents should check before buying.",
  path: "/football-gear/shin-pads/best-shin-pads-for-kids-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-shin-pads-for-kids-football"
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