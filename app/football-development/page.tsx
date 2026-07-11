import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development for Young Players | Football Parent",
  description:
    "Practical advice for parents on football development, football confidence, decision making, training balance, late developers and knowing when a child is ready for more.",
  path: "/football-development",
  type: "website",
});

export default function FootballDevelopmentPage() {
  return (
    <CategoryPage
      eyebrow="Football development"
      title="Football Development"
      description="Advice for parents supporting long-term football development, football confidence, training balance, decision making and player progression."
      intro={[
        "Football development is a long game. The players who make progress are rarely just the ones who trained hardest at age nine. They are usually the ones who stayed engaged, kept improving year on year, and had parents who understood what good development actually looks like at each stage.",
        "These guides cover the parts of player development that parents often worry about most: football confidence, decision making, football IQ, training load, relative age, late developers and knowing when a child may be ready for a more demanding environment. As a parent with first-hand experience of development centre environments in south London, I have written these guides to give you a realistic picture of what to expect and how to help.",
      ]}
      startHere={{
        title: "Start Here",
        description:
          "These guides cover the main development questions football parents usually face.",
        links: [
          {
            title: "Build Confidence in Young Footballers",
            href: "/football-development/build-confidence-young-footballers",
            description:
              "explains how football confidence develops and how parents can support it without adding pressure.",
          },
          {
            title: "Improve Football Decision Making",
            href: "/football-development/improve-football-decision-making",
            description:
              "covers scanning, football IQ, game understanding and how young players make better decisions.",
          },
          {
            title: "Good Football Development Environment",
            href: "/football-development/good-football-development-environment",
            description:
              "explains what parents should look for in a positive development setting.",
          },
          {
            title: "Relative Age Effect in Football",
            href: "/football-development/relative-age-effect-football",
            description:
              "explains how birth month, maturity and physical development can affect young players.",
          },
        ],
      }}
      articles={[
        {
          title: "How to Become a Professional Footballer",
          href: "/football-development/how-to-become-a-professional-footballer",
          description:
            "A realistic guide to the pathway towards professional football.",
        },
        {
          title: "Signs Your Child Is Ready for Academy Football",
          href: "/football-development/signs-your-child-is-ready-for-academy-football",
          description:
            "Key signs that a young player may be ready for a higher-level environment.",
        },
        {
          title: "How Much Training Is Too Much?",
          href: "/football-development/how-much-training-is-too-much",
          description:
            "Learn how to balance football training, recovery and enjoyment.",
        },
        {
          title: "Build Confidence in Young Footballers",
          href: "/football-development/build-confidence-young-footballers",
          description:
            "Practical ways to help young players develop football confidence and resilience.",
        },
        {
          title: "Improve Football Decision Making",
          href: "/football-development/improve-football-decision-making",
          description:
            "Help players improve football IQ, awareness, scanning and game understanding.",
        },
        {
          title: "Good Football Development Environment",
          href: "/football-development/good-football-development-environment",
          description:
            "What parents should look for in a positive development environment.",
        },
        {
          title: "Late Developers in Football",
          href: "/football-development/late-developers-in-football",
          description:
            "Why late developers can still thrive in football long term.",
        },
        {
          title: "Relative Age Effect in Football",
          href: "/football-development/relative-age-effect-football",
          description:
            "How relative age can impact a young footballer's development and opportunities.",
        },
        {
          title: "Understanding the New FA Youth Football Format",
          href: "/football-development/new-fa-youth-football-format",
          description:
            "An overview of the new FA youth football format and its impact on young players.",
        },
        {
          title: "Playing Up an Age Group in Football",
          href: "/football-development/playing-up-an-age-group-football",
          description:
            "When and how to support young players who are playing up an age group.",
        },
        {
          title: "What Is Football IQ? A Parent's Guide to Football Intelligence",
          href: "/football-development/what-is-football-iq",
          description:
            "Understanding the concept of football IQ and how it impacts player development.",
        },
        {
          title: "Is Private Football Coaching Worth It?",
          href: "/football-development/is-private-football-coaching-worth-it",
          description:
            "Understanding look at the pros and cons of private coaching.",
        },
      ]}
      bottomContent={{
        title: "About Football Development",
        content: [
          "Football development is about more than technical practice or moving into a higher-level team as early as possible. For young players, progress usually depends on a mix of confidence, game understanding, physical maturity, decision making, enjoyment and the quality of the environment around them. Parents often see only the visible parts of development, such as goals, tackles or selection decisions, but many of the most important improvements happen gradually over time.",
          "A good football development pathway should help children become more skilful, more resilient and more confident without losing their love of the game. That means balancing training with recovery, recognising the impact of growth and relative age, understanding that late developers can still catch up, and judging opportunities by how well they support the individual child rather than by the badge on the kit.",
          "The guides in this section are designed to help parents make sense of player development at grassroots, development centre and academy level. They cover football confidence, decision making, football IQ, training load, late development, playing up an age group and knowing when a child may be ready for a more demanding football environment.",
        ],
      }}
    />
  );
}