import { getArticleBySlug } from "@/lib/content";
import ArticleLayout from "@/lib/ArticleLayout";
import { MDXContent } from "@/lib/MDXContent";
import { generateSEO } from "@/lib/seo";
import CalculatorEmbed from "@/app/components/CalculatorEmbed";

export const metadata = generateSEO({
  title: "Free Equal Playing Time Calculator for Grassroots Football",
  description:
    "Free equal playing time calculator for grassroots football. Add your squad, pick your format and get a fair game time plan with changes at every break.",
  path: "/coaching/equal-playing-time-calculator",
  type: "website",
});

// A tool page, not an article: the Coach App's calculator sits above the
// body in the layout's hero slot (see CalculatorEmbed for the contract with
// the app), and the written content underneath is what Google ranks, since
// it cannot see inside the frame.
export default async function Page() {
  const article = getArticleBySlug("coaching", "equal-playing-time-calculator");

  return (
    <ArticleLayout
      kind="tool"
      hero={<CalculatorEmbed />}
      title={article.frontmatter.title}
      description={article.frontmatter.description}
      category={article.frontmatter.category}
      categoryUrl={article.frontmatter.categoryUrl}
      readTime={article.frontmatter.readTime}
      sections={article.frontmatter.sections}
      path="/coaching/equal-playing-time-calculator"
      datePublished={article.frontmatter.date}
      dateModified={article.frontmatter.dateModified}
      content={article.content}
    >
      <MDXContent content={article.content} slug={article.slug} coachAppBanner="coach" />
    </ArticleLayout>
  );
}
