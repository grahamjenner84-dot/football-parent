import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "PDC vs PTC vs RTC Explained | Football Parent",
  description:
    "A clear guide to understanding the differences between PDC, PTC, and RTC in UK football development.",
  path: "/academy-pathway/pdc-vs-ptc-vs-rtc-explained",
});

export default async function Page() {
  const article = getArticleBySlug(
    "academy-pathway",
    "pdc-vs-ptc-vs-rtc-explained"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      datePublished={article.frontmatter.date}
      path="/academy-pathway/pdc-vs-ptc-vs-rtc-explained"
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