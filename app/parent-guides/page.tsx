import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Parent Guides | Football Parent",
  description:
    "Honest football parenting advice covering confidence, matchday behaviour, academy decisions and supporting young players.",
  path: "/parent-guides",
  type: "website",
});

export default function ParentGuidesPage() {
  return (
    <CategoryPage
      eyebrow="Parent guides"
      title="Parent Guides"
      description="Realistic support and guidance for football parents navigating youth football and player development."
      intro={[
  "Being a football parent is more demanding than most people expect, and the way you show up on the touchline, in the car on the way home, and in conversations after a bad performance has a bigger impact on your child's development than most coaching manuals will tell you. These guides cover the practical and emotional side of supporting a young footballer, from how to handle academy rejection to what to say after a difficult match.",
]}
startHere={{
  title: "Start Here",
  description:
    "These guides cover common decisions, worries and mistakes football parents face.",
  links: [
    {
      title: "Are Football Development Centres Worth It?",
      href: "/parent-guides/are-football-development-centres-worth-it",
      description:
        "helps parents weigh up the cost, value and expectations of development centres.",
    },
    {
      title: "Leave Grassroots Football for an Academy?",
      href: "/parent-guides/leave-grassroots-football-for-an-academy",
      description:
        "looks at one of the biggest decisions families face in youth football.",
    },
    {
      title: "Biggest Football Parent Mistakes",
      href: "/parent-guides/biggest-football-parent-mistakes",
      description:
        "covers common parent behaviours that can harm confidence and enjoyment.",
    },
    {
      title: "What to Say After Football Matches",
      href: "/parent-guides/what-to-say-after-football-matches",
      description:
        "gives practical advice for supporting children after games.",
    },
  ],
}}      
articles={[
        {
          title: "What to Say After Football Matches",
          href: "/parent-guides/what-to-say-after-football-matches",
          description:
            "Simple ways parents can support players after matches.",
        },
        {
          title: "Support Your Child After a Bad Match",
          href: "/parent-guides/support-child-after-bad-match",
          description:
            "Practical guidance for helping players bounce back positively.",
        },
        {
          title: "Biggest Football Parent Mistakes",
          href: "/parent-guides/biggest-football-parent-mistakes",
          description:
            "Common mistakes football parents make and how to avoid them.",
        },
        {
          title: "Should You Leave Grassroots Football for an Academy?",
          href: "/parent-guides/leave-grassroots-football-for-an-academy",
          description:
            "Factors parents should consider before making the move.",
        },
          {
          title: "Are Football Development Centres Worth It?",
          href: "/parent-guides/are-football-development-centres-worth-it",
          description:
            "Weighing up the pros and cons of football development centres.",
        },
      ]}
    />
  );
}