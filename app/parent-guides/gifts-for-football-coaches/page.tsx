import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Gifts for Coaches: Christmas and End of Season Ideas | Football Parent",
  description: "Football gifts for coaches that grassroots volunteers use, from touchline gloves to a voucher, plus how much each family puts in and why the signed card matters.",
  path: "/parent-guides/gifts-for-football-coaches",
});

export default async function Page() {
  const article = getArticleBySlug(
    "parent-guides",
    "gifts-for-football-coaches"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/parent-guides/gifts-for-football-coaches"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
