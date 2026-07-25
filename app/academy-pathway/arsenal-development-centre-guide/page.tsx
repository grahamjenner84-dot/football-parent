import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Arsenal Development Centre Guide | Football Parent",
  description:
    "Arsenal's academy is Category 1 and based at Hale End, but there's no public development centre to apply to. How the pathway works, and what to do if scouted.",
  path: "/academy-pathway/arsenal-development-centre-guide",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "arsenal-development-centre-guide"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/arsenal-development-centre-guide"
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
