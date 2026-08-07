import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Academy Trials and Scouting | Football Parent",
  description:
    "Most academy players are found through scouting, not open trials. What coaches actually look for, how recruitment really works, and what happens on trial day.",
  path: "/academy-trials",
  type: "website",
});

export default function AcademyTrialsPage() {
  return (
    <CategoryPage
      eyebrow="Academy trials"
      title="Football Academy Trials"
      description="Most academy players are found through scouting, not open trials. What coaches actually look for, how recruitment really works, and what happens on trial day."
      intro={[
        "Football academy trials are one of the most misunderstood parts of youth football development. Most players will attend at least one trial during their development years, whether that is an open trial at a local club, an invitation to an EPPP academy session, or a development centre assessment. Having been through the process with my own child at Crystal Palace, I know how little honest information there is for parents going in for the first time. The guides below cover what scouts look for, how clubs recruit, and what really happens on the day.",
      ]}
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
          "Football academy trials are only one part of the wider recruitment process. Many young players are identified through grassroots matches, school football, development centres and recommendations before they are ever invited to attend a formal trial. Equally, attending a trial does not necessarily mean a club is looking to recruit immediately. Some assessments are simply opportunities for coaches to observe how a player learns, adapts and performs within a different environment.",
          "Understanding how academy scouting and recruitment works can help parents set realistic expectations. Coaches are rarely looking for the child who scores the most goals in a single session. Instead, they assess qualities such as decision making, technical ability, attitude, coachability and how consistently a player performs over time. Different clubs may also prioritise different attributes depending on the age group and stage of development.",
          "The guides in this section explain the academy trial process from a parent's perspective, including how players are scouted, what happens during assessments, what academy coaches typically look for and how families can best support children before, during and after a trial. The aim is to replace myths with practical, evidence-based guidance so parents can approach every opportunity with confidence and realistic expectations.",
        ],
      }}
    />
  );
}