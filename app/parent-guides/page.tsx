import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Parent Guides | Football Parent",
  description:
    "Academy decisions, the Junior Premier League, matchday behaviour and player development: what UK football parents actually need to weigh up before deciding.",
  path: "/parent-guides",
  type: "website",
});

export default function ParentGuidesPage() {
  return (
    <CategoryPage
      eyebrow="Parent guides"
      title="Parent Guides"
      description="Academy decisions, the Junior Premier League, matchday behaviour and player development: what UK football parents actually need to weigh up before deciding."
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
              "Should your child leave grassroots football for an academy? Compare the coaching, commitment, pressure, travel and development benefits before deciding.",
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
            "Should your child leave grassroots football for an academy? Compare the coaching, commitment, pressure, travel and development benefits before deciding.",
        },
        {
          title: "What is the Junior Premier League?",
          href: "/parent-guides/what-is-the-junior-premier-league",
          description:
            "What the Junior Premier League is: who runs it, how it works, age groups, costs, travel, and what standard of football your child can expect.",
        },
        {
          title: "JPL vs Grassroots Football",
          href: "/parent-guides/jpl-vs-grassroots-football",
          description:
            "Is JPL better than grassroots football? Coaching, match standard, playing time, costs, travel, development and family commitment, compared.",
        },
        {
          title: "Does the Junior Premier League Lead to Academy Football?",
          href: "/parent-guides/jpl-and-academy-football",
          description:
            "Playing in the JPL doesn't create an automatic route into an academy - scouts select on ability, not league. What actually gets a child noticed.",
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
            "A development centre is worth it when coaching is structured and your child enjoys it, not when cost or logistics create strain. The red flags to check first.",
        },
        {
          title: "What to Say After Football Matches",
          href: "/parent-guides/what-to-say-after-football-matches",
          description:
            "The best conversations to have with a child after football matches, and the mistakes to avoid.",
        },
        {
          title: "Support Your Child After a Bad Match",
          href: "/parent-guides/support-child-after-bad-match",
          description:
            "Three or four bad matches in a row is different from one bad match. The warning signs of a genuine confidence dip, what not to do, and when to talk to the coach.",
        },
        {
          title: "FutureFit Football DNA Interview Part 1",
          href: "/parent-guides/futurefit-football-dna-interview-part-1",
          description:
            "Football DNA's Paul Barry explains what the FA's FutureFit changes mean for young players, why 3v3 matters and how parents should think about long-term player development.",
        },
        {
          title: "FutureFit Football DNA Interview Part 2",
          href: "/parent-guides/futurefit-football-dna-interview-part-2",
          description:
            "Football DNA's Paul Barry explains whether 3v3 football is too chaotic, why some clubs are avoiding it, why 11v11 is moving to U14 and what FutureFit could change.",
        },
        {
          title: "What is Grassroots Football?",
          href: "/parent-guides/what-is-grassroots-football",
          description:
            "What grassroots football actually means, what ages it covers, who runs it and how it differs from academy football.",
        },
        {
          title: "How to Become a Grassroots Football Coach",
          href: "/parent-guides/how-to-become-a-football-coach",
          description:
            "How to become a grassroots football coach: joining as a volunteer, DBS checks, safeguarding, first aid, time commitment and coaching your own child.",
        },
        {
          title: "What Qualifications Do You Need to Be a Football Coach?",
          href: "/coaching/what-qualifications-do-i-need-to-be-a-football-coach",
          description:
            "FA Level 1 (now Introduction to Coaching Football) and Level 2 (UEFA C) explained for grassroots parent coaches: what's involved, what it costs, worth it?",
        },
        {
          title: "Biggest Football Parent Mistakes",
          href: "/parent-guides/biggest-football-parent-mistakes",
          description:
            "Sideline coaching, comparing siblings and chasing academy status cause damage parents rarely notice. A grassroots coach's own look at the mistakes he's seen most.",
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