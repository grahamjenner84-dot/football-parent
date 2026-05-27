import CategoryPage from "../components/category-page";
import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Football Development | Football Parent",
  description:
    "Practical football development advice for parents, including confidence, training balance, decision making and long-term progression.",
  path: "/football-development",
  type: "website",
});

export default function FootballDevelopmentPage() {
  return (
    <CategoryPage
      eyebrow="Football development"
      title="Football Development"
      description="Advice for parents supporting long-term football development, confidence, training balance and player progression."
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
            "Practical ways to help young players develop confidence and resilience.",
        },
        {
          title: "Improve Football Decision Making",
          href: "/football-development/improve-football-decision-making",
          description:
            "Help players improve awareness, scanning and game understanding.",
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
          title: "Is Private Football Coaching Worth It?",
          href: "/football-development/is-private-football-coaching-worth-it",
          description:
            "An honest look at the pros and cons of private coaching.",
        },
      ]}
    />
  );
}