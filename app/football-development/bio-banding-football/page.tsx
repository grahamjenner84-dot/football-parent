import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Bio Banding in Football Explained | Football Parent",
  description:
    "Bio-banding groups young players by physical development, not birth date. What it means, why academies use it, and whether to worry if your child is invited.",
  path: "/football-development/bio-banding-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "bio-banding-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/bio-banding-football"
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
