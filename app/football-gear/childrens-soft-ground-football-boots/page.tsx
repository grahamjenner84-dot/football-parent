import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Children's Soft Ground Football Boots: Do Kids Need Them? | Football Parent",
  description: "Most kids never need soft ground boots. When junior SG boots help on muddy grass, whether metal studs are allowed in youth football, and the 3G pitch rules.",
  path: "/football-gear/childrens-soft-ground-football-boots",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "childrens-soft-ground-football-boots"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/childrens-soft-ground-football-boots"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
