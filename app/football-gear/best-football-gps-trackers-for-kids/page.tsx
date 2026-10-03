import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Best Football GPS Trackers for Kids: Vests, Boot Sensors and Budget Picks | Football Parent",
  description: "STATSports needs no subscription, Footbar Meteor is the budget pick, CityPlay straps to the boot: which football GPS tracker or vest actually suits a child.", // must be word-for-word identical to the mdx frontmatter description
  path: "/football-gear/best-football-gps-trackers-for-kids",
});

export default async function Page() {
  const article = getArticleBySlug(
    "football-gear",
    "best-football-gps-trackers-for-kids"
  );

  return (
    <ArticleLayout
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/football-gear/best-football-gps-trackers-for-kids"
      datePublished={article.frontmatter.date}
      content={article.content}
    >
      <MDXContent content={article.content} />
    </ArticleLayout>
  );
}
