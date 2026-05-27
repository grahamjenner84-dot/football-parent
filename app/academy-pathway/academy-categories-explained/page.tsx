import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Academy Categories Explained | Football Parent",
  description:
    "Understand Category 1, 2, 3 and 4 football academies in England and what each academy category means for young players.",
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
