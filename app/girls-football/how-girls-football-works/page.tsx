import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "How Girls' Football Works: Ages, Wildcats, Squad and Leagues | Football Parent",
  description: "Wildcats from age 5, Squad for 11 to 16, then girls' or mixed teams up to Under-18. How girls' football in England works: ages, formats, leagues and clubs.", // must be word-for-word identical to the mdx frontmatter description
  path: "/girls-football/how-girls-football-works",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "how-girls-football-works"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/girls-football/how-girls-football-works"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
