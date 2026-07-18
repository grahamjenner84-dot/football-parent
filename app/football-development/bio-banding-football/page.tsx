import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Is Bio-Banding in Football? A Parent's Guide | Football Parent",
  description:
    "A jargon-free explanation of bio-banding in football: what it means, why academies use it, who it helps, and whether you should be concerned if your child is invited.",
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
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
