import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Veo Camera Alternatives: Cost & Comparisons | Football Parent",
  description:
    "Veo camera alternatives compared: real prices, subscription costs, XbotGo comparisons and whether Veo is worth it for grassroots football.",
  path: "/football-gear/veo-camera-alternatives",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "veo-camera-alternatives"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/veo-camera-alternatives"
      datePublished={article.frontmatter.date}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
