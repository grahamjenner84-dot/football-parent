import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Children's Astro Turf Trainers (TF and Indoor, 2026) | Football Parent",
  description: "Astro trainers suit sand-based astro and hard, dry pitches, but some 3G venues ban them. TF vs AG vs indoor soles, sizing for growing feet, and kids pairs to buy.",
  path: "/football-gear/childrens-astro-turf-trainers",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "childrens-astro-turf-trainers"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/childrens-astro-turf-trainers"
      datePublished={article.frontmatter.date}
      design={article.frontmatter.design}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} design={article.frontmatter.design} />
    </ArticleLayout>
  );
}
