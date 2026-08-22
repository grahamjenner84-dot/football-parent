import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "What Age Do Girls Academies Recruit? | Football Parent",
  description:
    "Understanding the recruitment ages and pathway stages within girls academy football in the UK.",
  path: "/girls-football/what-age-do-girls-football-academies-recruit",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "what-age-do-girls-football-academies-recruit"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/what-age-do-girls-football-academies-recruit"
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