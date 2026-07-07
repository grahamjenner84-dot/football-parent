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
          title: "Does the Junior Premier League Lead to Academy Football?",
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
          title: "What is Grassroots Football?",
          href: "/parent-guides/what-is-grassroots-football",
          description:
            "What grassroots football actually means, what ages it covers, who runs it and how it differs from academy football. A clear guide for UK parents.",
        },
        {
          title: "Biggest Football Parent Mistakes",
          href: "/parent-guides/biggest-football-parent-mistakes",
          description:
            "Common mistakes football parents make and how to avoid them.",
        },
      ]}
      bottomContent={{
        title: "About Football Parent Guides",
        content: [
          "Football parenting is often about making judgement calls without having perfect information. Parents may need to decide whether to move clubs, accept a development centre place, attend JPL trials, pursue academy opportunities, change teams or simply step back and let a child enjoy the game. Those decisions can feel bigger than they are when everyone around youth football seems to have an opinion.",
          "Good football parenting is not about pushing a child as far as possible as quickly as possible. It is about understanding the environment, protecting confidence, asking better questions and recognising when an opportunity genuinely supports long-term development. The right decision for one child may be completely wrong for another, depending on personality, maturity, motivation, coaching quality, match time and family circumstances.",
          "The guides in this section help parents navigate the wider football journey, including grassroots football, academy decisions, the Junior Premier League, development centres, matchday behaviour, confidence and setbacks. The aim is to give families realistic, independent advice so they can support young players with more clarity and less pressure.",
        ],
      }}
    />
  );
}