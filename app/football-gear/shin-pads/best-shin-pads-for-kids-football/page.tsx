import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Shin Pads for Kids Football | Football Parent",
  description:
    "Which shin pads to buy for your child: slip-in, ankle guard and sleeve picks, a size chart by height and age, and how to check they fit before a match.",
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
      datePublished={article.frontmatter.date}
      path="/football-gear/shin-pads/best-shin-pads-for-kids-football"
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