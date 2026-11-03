import { Fira_Sans_Condensed } from "next/font/google";

// The comic-accent design (Football Parent homepage concepts canvas,
// "B · Comic accents (yellow)"): ink outlines, hard offset shadows, Fira Sans
// Condensed 800 headings and the Coach App's yellow. Shared by the Coach App
// landing pages (app/components/CoachLandingPage.tsx) and the articles that
// opt in with `design: "comic"` in their frontmatter (lib/ArticleLayout.tsx),
// so the two stay one look while the rest of the site moves over page by page.

export type ArticleDesign = "classic" | "comic";

export const INK = "#201E1D";

// The headline face. Loaded only by pages that use the design, so the rest of
// the site does not preload it; globals.css maps `font-display` onto the
// variable and falls back to Fira Sans bold anywhere it is not defined.
export const firaSansCondensed = Fira_Sans_Condensed({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-fira-sans-condensed",
  display: "swap",
});

// The Coach App landing pages' body overrides. They restyle an MDX body
// rendered by the shared MDXContent, whose element styles are the classic
// article template's. Comic articles do not use this: MDXContent gives them
// their own element styles (design="comic"). A `[&_h2]` rule beats
// MDXContent's own classes because it is one element more specific.
export const COMIC_BODY_STYLES = [
  "[&_h2]:font-display [&_h2]:text-[32px] [&_h2]:lg:text-[40px] [&_h2]:leading-[1.05] [&_h2]:text-[#201E1D] [&_h2]:font-extrabold",
  "[&_h3]:text-[22px] [&_h3]:text-[#201E1D]",
  "[&_a]:text-[#1F5FD6] [&_a]:font-bold",
  "[&_table]:border-2 [&_table]:border-[#201E1D] [&_th]:border-[#201E1D] [&_td]:border-[#C9C4BA] [&_th]:bg-[#FFC400] [&_th]:text-[#201E1D]",
  "[&_tr:nth-child(even)]:bg-[#FFF8E1]",
  "[&_blockquote]:border-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#201E1D] [&_blockquote]:bg-[#FFF8E1] [&_blockquote]:rounded-xl [&_blockquote]:shadow-[4px_4px_0_#201E1D]",
].join(" ");
