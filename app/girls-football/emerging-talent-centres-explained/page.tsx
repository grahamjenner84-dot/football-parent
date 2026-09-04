import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Emerging Talent Centres Explained | Football Parent",
  description:
    "What are Emerging Talent Centres in girls' football? How ETCs work, how recruitment happens, where they fit in the current FA girls' pathway, and what replaced RTCs.",
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
      content={article.content}
      
    >
      <MDXContent content={article.content} slug={article.slug} />
    </ArticleLayout>
  );
}