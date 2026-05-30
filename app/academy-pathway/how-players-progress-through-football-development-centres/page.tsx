import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "PDC vs PTC vs RTC Explained | Football Parent",
  description:
    "A clear guide to understanding the differences between PDC, PTC, and RTC in UK football development.",
  path: "/how-players-progress-through-football-development-centres",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "how-players-progress-through-football-development-centres"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
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