import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Build Confidence in Young Footballers | Football Parent",
  description:
    "Practical ways parents can help young footballers build confidence, recover from mistakes and enjoy their development.",
  path: "/football-development/build-confidence-young-footballers",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "build-confidence-young-footballers"
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