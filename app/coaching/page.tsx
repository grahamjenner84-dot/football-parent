import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Grassroots Football Coaching Guides | Football Parent",
  description:
    "Coaching qualifications, formations by age group, session drills, fair playing time and squad admin: practical guides for grassroots volunteer coaches.",
  path: "/coaching",
  type: "website",
});

export default function CoachingPage() {
  return (
    <CategoryPage
      eyebrow="Coaching"
      title="Coaching"
      description="Coaching qualifications, formations by age group, session drills, fair playing time and squad admin: practical guides for grassroots volunteer coaches."
      intro={[
        "Most grassroots coaches start the same way: someone at the club asks whether you fancy helping out, and a few weeks later you are running a squad of twelve on a Sunday morning. There is very little handed to you beyond a bag of balls and a fixture list, and the questions come quickly. What qualification do you actually need? Which formation suits an under-10 side? How do you rotate players so nobody's parent feels short-changed?",
        "These guides answer those questions from the touchline rather than from a coaching manual. They cover the FA courses and what they cost, the 2026/27 format changes and what they mean for your age group, ball mastery sessions that work with young players, playing time that is genuinely fair, and the admin side of tracking a squad across a season.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "The four things new grassroots coaches usually need to sort out first.",
        links: [
          {
            title: "What Qualifications Do You Need to Be a Football Coach?",
            href: "/coaching/what-qualifications-do-i-need-to-be-a-football-coach",
            description:
              "covers the FA courses, what they cost and what you legally need before you can coach.",
          },
          {
            title: "Best Football Formations by Age Group",
            href: "/coaching/best-football-formations-by-age-group",
            description:
              "explains the 7v7 and 9v9 formats under the FA's 2026/27 changes and which shapes suit each.",
          },
          {
            title: "Equal Playing Time in Grassroots Football",
            href: "/coaching/equal-playing-time-in-grassroots-football",
            description:
              "gives a working rotation formula and the difference between equal minutes and equal position time.",
          },
          {
            title: "Ball Mastery Drills for 7 and 8 Year Olds",
            href: "/coaching/football-drills-for-7-and-8-year-olds",
            description:
              "sets out cone circuits, 1v1 games and passing routines, plus how long a session should really last.",
          },
        ],
      }}
      articles={[
        {
          title: "What Qualifications Do You Need to Be a Football Coach?",
          href: "/coaching/what-qualifications-do-i-need-to-be-a-football-coach",
          description:
            "FA Level 1 (now Introduction to Coaching Football) and Level 2 (UEFA C) explained for grassroots parent coaches: what's involved, what it costs, worth it?",
        },
        {
          title: "Best Football Formations by Age Group",
          href: "/coaching/best-football-formations-by-age-group",
          description:
            "7v7 now starts at U10 and 9v9 at U12 under the FA's 2026/27 format changes. Pitch sizes, rules and suggested formations for both explained.",
        },
        {
          title: "Equal Playing Time in Grassroots Football",
          href: "/coaching/equal-playing-time-in-grassroots-football",
          description:
            "A working formula for fair playing time, the real difference between equal minutes and equal position time, and what rolling substitutions actually allow.",
        },
        {
          title: "Ball Mastery Drills for 7 and 8 Year Olds",
          href: "/coaching/football-drills-for-7-and-8-year-olds",
          description:
            "Cone circuits, 1v1 games and passing routines for 7 and 8 year olds, plus how long a ball mastery session should actually last.",
        },
        {
          title: "Football Team Spreadsheet",
          href: "/coaching/football-team-spreadsheet",
          description:
            "What to track on a football team spreadsheet, a simple structure for goals, assists and playing time, and when it's worth moving to an app instead.",
        },
      ]}
      bottomContent={{
        title: "About Grassroots Coaching",
        content: [
          "Grassroots coaching in England is overwhelmingly volunteer work. Most teams are run by a parent who agreed to help and then found themselves responsible for session planning, matchday selection, substitutions, kit, subs collection and the WhatsApp group. The FA's own courses cover a lot of the football side, but they say far less about the week-to-week judgement calls that take up most of a coach's time.",
          "The decisions that cause the most friction are rarely tactical. They are about who starts, how minutes get shared out, whether a weaker player gets the same development as a stronger one, and how to explain any of it to a parent on the touchline. Getting those right early tends to matter more to whether children stay in the game than the formation you pick.",
          "These guides are written from the perspective of someone doing the job rather than teaching it, covering qualifications, formats, session content, rotation and record keeping for coaches at under-7 through to under-14 level.",
        ],
      }}
    />
  );
}
