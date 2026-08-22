import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "FutureFit Football DNA Interview Part 2 | Football Parent",
  description:
    "Football DNA's Paul Barry on whether 3v3 football is too chaotic, why some clubs avoid it, why 11v11 is moving to U14, and what FutureFit could change.",
  path: "/parent-guides/futurefit-football-dna-interview-part-2",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "futurefit-football-dna-interview-part-2"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/futurefit-football-dna-interview-part-2"
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