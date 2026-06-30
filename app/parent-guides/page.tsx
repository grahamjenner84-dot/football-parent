import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Parent Guides | Football Parent",
  description:
    "Independent football parenting advice covering academy decisions, the Junior Premier League, player development, confidence, matchday behaviour and supporting young players.",
  path: "/parent-guides",
  type: "website",
});

export default function ParentGuidesPage() {
  return (
    <CategoryPage
      eyebrow="Parent guides"
      title="Parent Guides"
      description="Independent, evidence-based advice to help football parents make confident decisions about youth football, player development, academies and the Junior Premier League."
      intro={[
        "Being a football parent involves far more than standing on the touchline. You'll make decisions about clubs, leagues, development centres, academy opportunities and how best to support your child through both successes and setbacks. These guides combine practical football parenting advice with independent explanations of common pathways, helping you make informed decisions without the hype or pressure that often surrounds youth football.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "These guides cover the common decisions, worries and mistakes football parents face.",
        links: [
          {
            title: "Should You Leave Grassroots Football for an Academy?",
            href: "/parent-guides/leave-grassroots-football-for-an-academy",
            description:
              "looks at one of the biggest decisions families face in youth football.",
          },
          {
            title: "What is the Junior Premier League?",
            href: "/parent-guides/what-is-the-junior-premier-league",
            description:
              "explains what the JPL is, how it works and what parents should consider.",
          },
          {
            title: "Are Football Development Centres Worth It?",
            href: "/parent-guides/are-football-development-centres-worth-it",
            description:
              "helps parents weigh up the cost, value and expectations of development centres.",
          },
          {
            title: "Biggest Football Parent Mistakes",
            href: "/parent-guides/biggest-football-parent-mistakes",
            description:
              "covers common parent behaviours that can harm confidence and enjoyment.",
          },
        ],
      }}
      articles={[
        {
          title: "Should You Leave Grassroots Football for an Academy?",
          href: "/parent-guides/leave-grassroots-football-for-an-academy",
          description:
            "Factors parents should consider before making the move from grassroots to academy football.",
        },
        {
          title: "What is the Junior Premier League?",
          href: "/parent-guides/what-is-the-junior-premier-league",
          description:
            "A parent-friendly guide to what the Junior Premier League is, how it works and whether it may suit your child.",
        },
        {
          title: "JPL vs Grassroots Football",
          href: "/parent-guides/jpl-vs-grassroots-football",
          description:
            "Compare the Junior Premier League with traditional grassroots football to understand the differences, benefits and trade-offs.",
        },
        {
          title: "JPL and Academy Football",
          href: "/parent-guides/jpl-and-academy-football",
          description:
            "Understand the relationship between the Junior Premier League, academy scouting and player development.",
        },
        {
          title: "JPL Trials: How to Get Into the JPL",
          href: "/parent-guides/how-to-get-into-the-jpl",
          description:
            "Learn how JPL trials work, how to join a Junior Premier League club, what coaches look for, typical costs and what parents should expect from the recruitment process.",
        },
        {
          title: "Are Football Development Centres Worth It?",
          href: "/parent-guides/are-football-development-centres-worth-it",
          description:
            "Weighing up the pros, cons, costs and expectations of football development centres.",
        },
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
          title: "FutureFit Football DNA Interview Part 1",
          href: "/parent-guides/futurefit-football-dna-interview-part-1",
          description:
            "Join us for an exclusive interview with FutureFit Football's DNA expert as we explore the science behind player development.",
        },
        {
          title: "Biggest Football Parent Mistakes",
          href: "/parent-guides/biggest-football-parent-mistakes",
          description:
            "Common mistakes football parents make and how to avoid them.",
        },
      ]}
    />
  );
}