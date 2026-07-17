import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Category 1, 2, 3 & 4 Football Academies Explained | Football Parent",
  description:
    "What's the difference between a Category 1 and Category 4 academy? What each level means for training hours, travel, facilities and your child's development.",
  path: "/academy-pathway/academy-categories-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "academy-categories-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/academy-categories-explained"
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
