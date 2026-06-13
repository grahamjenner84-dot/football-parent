import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How to Get Scouted for Football | Football Parent",
  description:
    "Learn how to increase your chances of getting scouted for football, from technical ability to decision making and attitude.",
  path: "/academy-trials/how-to-get-scouted-for-football",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-trials",
    "how-to-get-scouted-for-football"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-trials/how-to-get-scouted-for-football"
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