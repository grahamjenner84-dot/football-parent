import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Improve Football Decision Making | Football Parent",
  description:
    "Decision making is one of the hardest skills to coach in youth football. How parents and coaches can help players think faster and clearer on the pitch.",
  path: "/football-development/improve-football-decision-making",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-development",
    "improve-football-decision-making"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/football-development/improve-football-decision-making"
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