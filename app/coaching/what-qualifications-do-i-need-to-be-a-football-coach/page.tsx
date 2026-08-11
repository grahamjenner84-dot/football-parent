import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Qualifications Do You Need to Be a Football Coach? | Football Parent",
  description: "FA Level 1 (now Introduction to Coaching Football) and Level 2 (UEFA C) explained for grassroots parent coaches: what's involved, what it costs, worth it?",
  path: "/coaching/what-qualifications-do-i-need-to-be-a-football-coach",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "what-qualifications-do-i-need-to-be-a-football-coach"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/what-qualifications-do-i-need-to-be-a-football-coach"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
