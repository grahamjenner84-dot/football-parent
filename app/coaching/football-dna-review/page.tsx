import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football DNA App Review: Is It Worth £7.99 a Month? | Football Parent",
  description: "Football DNA costs £7.99 a month or £59.99 a year. A grassroots coach's review after a year of paid use: filmed sessions, curriculums and who should pay.", // must be word-for-word identical to the mdx frontmatter description
  path: "/coaching/football-dna-review",
});

export default async function Page() {
  const article = getArticleBySlug(
    "coaching",
    "football-dna-review"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/football-dna-review"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
