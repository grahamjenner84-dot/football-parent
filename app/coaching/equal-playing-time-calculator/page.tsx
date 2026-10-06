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

// The MDX body is split at this marker: the paragraphs before it are the
// lead, rendered above the calculator so a visitor knows what the box is
// before they meet it (and so the paragraph carrying the target phrasings
// is in the first screen, not 1,400px down). Everything after it is the
// body. The full content still goes to ArticleLayout for the FAQ schema.
const CALCULATOR_MARKER = "{/* calculator */}";

// A tool page, not an article: the Coach App's calculator sits in the
// layout's hero slot under the lead (see CalculatorEmbed for the contract
// with the app), and the written content underneath is what Google ranks,
// since it cannot see inside the frame.
export default async function Page() {
  const article = getArticleBySlug("coaching", "equal-playing-time-calculator");
  const markerAt = article.content.indexOf(CALCULATOR_MARKER);
  const lead = markerAt === -1 ? "" : article.content.slice(0, markerAt);
  const body =
    markerAt === -1 ? article.content : article.content.slice(markerAt + CALCULATOR_MARKER.length);

  return (
    <ArticleLayout
      kind="tool"
      hero={
        <>
          {lead && (
            <div className="max-w-2xl mb-10">
              <MDXContent content={lead} coachAppBanner="none" />
            </div>
          )}
          <CalculatorEmbed />
        </>
      }
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
      <MDXContent content={body} slug={article.slug} coachAppBanner="coach" />
    </ArticleLayout>
  );
}
