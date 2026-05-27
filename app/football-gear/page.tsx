import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Gear | Football Parent",
  description:
    "Parent-friendly football gear advice including boots, shin pads, footballs and training equipment for young players.",
  path: "/football-gear",
  type: "website",
});

export default function FootballGearPage() {
  return (
    <CategoryPage
      eyebrow="Football gear"
      title="Football Gear"
      description="Trusted football equipment advice for parents buying boots, shin pads, gloves and training essentials."
      articles={[
        {
          title: "AG vs FG Boots",
          href: "/football-gear/ag-vs-fg-boots",
          description:
            "Understand the difference between AG and FG football boots.",
        },
        {
          title: "Best Football Gloves for Winter Training",
          href: "/football-gear/best-football-gloves-for-winter-training",
          description:
            "Warm, practical glove options for winter football sessions.",
        },
        {
          title: "Best Footballs by Age",
          href: "/football-gear/best-footballs-by-age",
          description:
            "Choose the right football size and type for different ages.",
        },
        {
          title: "Best Football Boots for Wide Feet Kids",
          href: "/football-gear/boots/best-football-boots-for-wide-feet-kids",
          description:
            "Comfort-focused football boot options for wider feet.",
        },
        {
          title: "Best Shin Pads for Kids Football",
          href: "/football-gear/shin-pads/best-shin-pads-for-kids-football",
          description:
            "Trusted shin pad options for young footballers.",
        },
      ]}
    />
  );
}