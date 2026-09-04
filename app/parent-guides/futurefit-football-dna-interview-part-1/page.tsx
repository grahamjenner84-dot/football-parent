import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "FutureFit Football DNA Interview Part 1 | Football Parent",
  description:
    "Football DNA's Paul Barry explains what the FA's FutureFit changes mean for young players, why 3v3 matters and how parents should think about development.",
  path: "/parent-guides/futurefit-football-dna-interview-part-1",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "futurefit-football-dna-interview-part-1"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/parent-guides/futurefit-football-dna-interview-part-1"
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}