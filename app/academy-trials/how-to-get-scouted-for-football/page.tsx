import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Get Scouted for Football | Football Parent",
  description:
    "Paid showcase events rarely help: scouts assess players through live football, not highlight reels. What improves a child's chances of being noticed.",
  path: "/academy-trials/how-to-get-scouted-for-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "how-to-get-scouted-for-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/how-to-get-scouted-for-football"
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