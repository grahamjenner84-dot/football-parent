import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Emerging Talent Centres Explained | Football Parent",
  description:
    "Learn about emerging talent centres in girls' football and how they support player development.",
  path: "/girls-football/emerging-talent-centres-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "girls-football",
    "emerging-talent-centres-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/girls-football/emerging-talent-centres-explained"
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