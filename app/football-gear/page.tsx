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
      intro={[
        "Buying football equipment for a child who is developing quickly is rarely straightforward. Boot technology has outpaced most buying guides, sizing varies between brands, and what works on a 3G surface does not always work on grass. These guides cut through the noise with honest, practical advice on boots, goals, training equipment and kit, written for parents rather than coaches or serious players.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "These guides help parents choose suitable football kit and equipment for young players.",
        links: [
          {
            title: "Best Footballs by Age",
            href: "/football-gear/best-footballs-by-age",
            description:
              "explains which football size is right for different age groups.",
          },
          {
            title: "AG vs FG Boots",
            href: "/football-gear/ag-vs-fg-boots",
            description:
              "explains the difference between artificial grass and firm ground boots.",
          },
          {
            title: "Best Football Boots for Wide Feet Kids",
            href: "/football-gear/boots/best-football-boots-for-wide-feet-kids",
            description:
              "helps parents find boots for children who need a wider fit.",
          },
          {
            title: "Best Shin Pads for Kids Football",
            href: "/football-gear/shin-pads/best-shin-pads-for-kids-football",
            description:
              "covers what to look for when choosing shin pads for young players.",
          },
        ],
      }}
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
      bottomContent={{
        title: "About Football Gear",
        content: [
          "Choosing football gear for children is often more confusing than it needs to be. Parents have to think about boot fit, playing surface, shin pad comfort, football size, winter training, school requirements and how quickly children grow out of kit. The best option is not always the most expensive one, especially for young players who are still developing physically and technically.",
          "Good football equipment should help a child play comfortably and safely without becoming a distraction. Boots need to suit the surface as well as the shape of the foot, footballs should match the correct age group, and shin pads should be protective without stopping a child from moving naturally. Small details such as grip, warmth, sizing and comfort can make a real difference over a full season.",
          "The guides in this section are written for parents who want practical football kit advice without overcomplicated product language. They cover football boots, AG and FG soleplates, football sizes, shin pads, gloves and other training essentials, with the aim of helping families buy suitable equipment for young players at grassroots, school and development centre level.",
        ],
      }}
    />
  );
}