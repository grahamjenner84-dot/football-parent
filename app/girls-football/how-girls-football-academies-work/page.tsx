import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Girls Football Academies Work | Football Parent",
  description:
    "Understand how girls football academies work in the UK, including pathways, trials, development and what parents should expect.",
  path: "/girls-football/how-girls-football-academies-work",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "how-girls-football-academies-work"
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