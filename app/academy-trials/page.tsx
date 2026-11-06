import CategoryPage from "../components/category-page";
import InstagramCategoryPromo from "../components/InstagramCategoryPromo";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Academy Trials and Scouting | Football Parent",
  description:
    "Most academy players are found through scouting, not open trials. What coaches look for, how recruitment works, and what happens on trial day.",
  path: "/academy-trials",
  type: "website",
});

export default function AcademyTrialsPage() {
  return (
    <CategoryPage
      title="Football Academy Trials"
      description="Most academy players are found through scouting, not open trials. What coaches look for, how recruitment works, and what happens on trial day."
      intro={[
        "Football academy trials are widely misunderstood. Most players will attend at least one trial during their development years, whether that is an open trial at a local club, an invitation to an EPPP academy session, or a development centre assessment.",
      ]}
      // No sponsor yet: the Instagram follow box holds the slot until one
      // takes it (see app/components/InstagramCategoryPromo.tsx).
      promo={<InstagramCategoryPromo />}
      startHere={{
        title: "Start Here",
        description:
          "New to academy trials? These guides explain the main parts of the process.",
        links: [
          {
            title: "Football Academy Trials in the UK",
            href: "/academy-trials/football-academy-trials-uk",
            description:
              "explains how trials, scouting and recruitment usually work.",
          },
          {
            title: "Football Trials Near Me",
            href: "/academy-trials/football-trials-near-me",
            description:
              "covers how to find genuine opportunities and avoid unrealistic promises.",
          },
          {
            title: "How to Get Scouted for Football",
            href: "/academy-trials/how-to-get-scouted-for-football",
            description:
              "looks at how young players get noticed by clubs and scouts.",
          },
          {
            title: "What Happens at Academy Trials",
            href: "/academy-trials/what-happens-at-academy-trials",
            description:
              "is useful if your child already has a trial or assessment coming up.",
          },
        ],
      }}
      articlesHeading="All Academy Trial Guides"
      articles={[
        {
          title: "Football Academy Trials in the UK",
          href: "/academy-trials/football-academy-trials-uk",
          description:
            "Most academy players are found through scouting, not open trials. How genuine football academy trials work in the UK, how to spot scams, and what to expect.",
        },
        {
          title: "Football Trials Near Me",
          href: "/academy-trials/football-trials-near-me",
          description:
            "How to find legitimate football trials and avoid unrealistic promises.",
        },
        {
          title: "How Football Scouts Identify Players",
          href: "/academy-trials/how-football-scouts-identify-players",
          description:
            "Scouts spend more time watching what happens away from the ball than goals or assists: scanning, reactions to mistakes, work rate. What gets noticed, age by age.",
        },
        {
          title: "What Happens at Academy Trials",
          href: "/academy-trials/what-happens-at-academy-trials",
          description:
            "What to expect on the day of a football academy trial, and how to prepare a child for trial at an academy or development centre.",
        },
        {
          title: "How to Get Scouted for Football",
          href: "/academy-trials/how-to-get-scouted-for-football",
          description:
            "Paid showcase events rarely help: scouts assess players through live football, not highlight reels. What genuinely improves your child's chances of being noticed.",
        },
        {
          title: "What Do Academy Coaches Look For?",
          href: "/academy-trials/what-do-academy-coaches-look-for",
          description:
            "It's rarely goals or pace: academy coaches watch what a player does before the ball arrives. The technical and behavioural traits that get noticed.",
        },
        {
          title: "How Football Clubs Recruit Young Players",
          href: "/academy-trials/how-football-clubs-recruit-young-players",
          description:
            "How do professional football clubs actually find and recruit young players? How scouting, development centres, referrals and trials fit together, and what parents should realistically expect.",
        },
      ]}
      bottomContent={{
        title: "About Football Academy Trials",
        content: [
          "Trials are only one part of the wider recruitment process. Many young players are identified through grassroots matches, school football, development centres and recommendations before they are ever invited to attend a formal trial. Equally, attending a trial does not necessarily mean a club is looking to recruit immediately. Some assessments are simply opportunities for coaches to observe how a player learns, adapts and performs within a different environment.",
          "Knowing how scouting and recruitment work helps parents set expectations. Coaches are rarely looking for the child who scores the most goals in a single session. Instead, they assess qualities such as decision making, technical ability, attitude, coachability and how consistently a player performs over time. Different clubs may also prioritise different attributes depending on the age group and stage of development.",
          "The guides here explain the academy trial process from a parent's side: how players are scouted, what happens during assessments, what academy coaches look for and how families can support a child before, during and after a trial.",
        ],
      }}
    />
  );
}