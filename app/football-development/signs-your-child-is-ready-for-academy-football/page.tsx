import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Is My Child Ready for Academy Football? | Football Parent",
  description:
    "Learn the key signs that a young footballer may be ready for academy football and what parents should realistically expect.",
  path: "/football-development/signs-your-child-is-ready-for-academy-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "signs-your-child-is-ready-for-academy-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/signs-your-child-is-ready-for-academy-football"
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