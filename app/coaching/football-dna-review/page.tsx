import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football DNA Review: Is It Worth £7.99 a Month for Grassroots Coaches? | Football Parent",
  description: "Football DNA costs £7.99 a month for 1,000+ filmed sessions. A grassroots U8 coach's review: what you get, what's missing, and who should pay for it.", // must be word-for-word identical to the mdx frontmatter description
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
