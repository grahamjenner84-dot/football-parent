import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Football Parent | Football Parent",
  description:
    "Football Parent is an independent website helping UK families navigate football academies, development centres, trials and youth football pathways. No agenda. Just honest guidance.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/about",
  },
};

export default function AboutFootballParentPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Independent guidance for football families
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            About Football Parent
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            Football Parent exists because navigating youth football in the UK
            is harder than it should be - and most families are figuring it out
            on their own.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            This is a website for football parents: the people dropping their
            children at training in the dark, sitting in the car outside
            development centres hoping for the best, trying to work out what a
            trial actually means, or wondering whether to keep pushing or let
            their child find their own way.
          </p>

          <p>
            It is independent, practical, and written by someone who has been
            through it.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            The problem this site tries to solve
          </h2>

          <p>
            The UK youth football system is genuinely complex. There are
            academies, development centres, centres of excellence, player
            training centres, player development centres, regional talent clubs,
            emerging talent centres - and that is before you get into EPPP
            categories, age group differences, and how the girls&apos; pathway
            differs from the boys&apos;.
          </p>

          <p>
            Most parents encounter this system without any context. Their child
            gets invited to a trial or a development centre, and suddenly they
            are trying to understand a world that feels opaque and slightly
            intimidating. Clubs are not always forthcoming with detail. Online
            forums are a mixture of useful experience and strong opinions from
            people who do not always know more than you do. Much of the formal
            guidance is written for coaches, not families.
          </p>

          <p>
            What parents actually need is someone who has been through it,
            explains it clearly, and tells them what they actually need to know
            - including the uncomfortable parts.
          </p>

          <p>That is what Football Parent tries to be.</p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Who this is for
          </h2>

          <p>
            Football Parent is written for families across the UK whose children
            play football at any level, but who are specifically navigating - or
            thinking about navigating - the more structured end of youth
            football.
          </p>

          <p>That includes:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              Parents of children attending development centres or centres of
              excellence who want to understand what it means and what to expect
            </li>
            <li>
              Families preparing for or going through academy trials who want
              honest information rather than vague reassurance
            </li>
            <li>
              Parents supporting children who have been released from an academy
              or development centre and are working out what comes next
            </li>
            <li>
              Families involved in girls&apos; football who are navigating a
              separate and still-developing pathway
            </li>
            <li>
              Grassroots football parents who want to understand how the broader
              system works
            </li>
            <li>
              Anyone who wants to support their child&apos;s football journey
              without applying too much pressure or getting in the way
            </li>
          </ul>

          <p>
            You do not need to have a child at an elite academy to find this
            site useful. The questions around player development, managing
            expectations, and keeping football enjoyable apply at every level.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            What this site covers
          </h2>

          <p>
            Football Parent is built around topical depth rather than breadth.
            The goal is to cover a focused set of subjects properly, rather than
            skimming every aspect of football.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Football academies
          </h3>

          <p>
            How the English academy system is structured, what the different
            EPPP categories mean, what life inside an academy looks like from a
            family perspective, and what happens at each age group.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Development centres
          </h3>

          <p>
            What development centres are, how they differ from academies, what
            sessions typically involve, and how to approach them as a parent.
            This is an area where first-hand experience particularly shapes the
            content.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Academy trials
          </h3>

          <p>
            What different types of trials exist, how to prepare your child
            without overdoing it, what coaches are actually looking for, and how
            to handle the outcome - whether positive or not.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Player development
          </h3>

          <p>
            Long-term athlete development principles, what good coaching looks
            like at different ages, how parents can genuinely support
            development, and where they sometimes hinder it.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Girls&apos; football pathways
          </h3>

          <p>
            The specific routes available for girls in England, including
            Emerging Talent Centres, the WSL academy system, and how the
            girls&apos; pathway compares to and differs from the boys&apos;.
          </p>

          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 pt-4">
            Football parenting
          </h3>

          <p>
            The less technical but equally important side of youth football:
            managing expectations, keeping the game enjoyable, handling
            disappointment, and knowing when your child needs support rather
            than coaching from the touchline.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Why independent guidance matters
          </h2>

          <p>
            Football Parent has no affiliation with any club, academy, agency,
            or coaching provider. There are no partnerships with clubs. Nothing
            on this site is written to reflect well on any particular
            organisation.
          </p>

          <p>
            That independence matters because the youth football system is one
            where commercial interests can blur the lines. Agent services,
            coaching programmes, trial preparation companies, and academy-linked
            ventures all exist, and some are genuinely useful. But parents
            deserve guidance that is not shaped by those relationships.
          </p>

          <p>
            Where affiliate links exist, for example to equipment, that is
            clearly disclosed.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            The founder&apos;s journey
          </h2>

          <p>
            Football Parent was created by{" "}
            <Link
              href="/author/graham-jenner"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Graham Jenner
            </Link>
            , whose son has attended Crystal Palace&apos;s Development Centre,
            Chelsea&apos;s Player Training Centre, and Chelsea&apos;s Player
            Development Centre.
          </p>

          <p>
            Each of those experiences shaped how this site is written.
            Attending a development centre for the first time is a significant
            moment for any family. The excitement is real, but so is the
            uncertainty. What do the coaches want to see? How should you behave
            on the touchline? What does it mean if your child is retained - or
            not? Those are questions Graham had no clean answers to when he
            started, and they are the questions this site tries to address.
          </p>

          <p>
            Alongside being a football parent, Graham coaches at grassroots
            level and holds an FA Level 2 qualification. That background informs
            the player development content without pretending to insider
            knowledge of the professional game.
          </p>

          <p>
            The site&apos;s authority comes from lived experience, careful
            research, and a commitment to being honest - including about what is
            not known.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            The philosophy here
          </h2>

          <p>A few things guide how this site is written:</p>

          <p>
            <strong>Honesty over reassurance.</strong> If something in the youth
            football system is difficult, unfair, or uncertain, this site says
            so. Parents are better served by accurate information than by being
            told what they want to hear.
          </p>

          <p>
            <strong>Experience over speculation.</strong> Content draws on
            first-hand experience where it is relevant and flags when it does
            not. When research from the FA or other organisations is cited, it
            is linked.
          </p>

          <p>
            <strong>Realism over hype.</strong> The vast majority of children in
            development centres and academies will not become professional
            footballers. That is not a failure. Helping families navigate that
            reality is just as important as covering what good development looks
            like.
          </p>

          <p>
            <strong>Parents, not scouts.</strong> This site is written for
            families, not for people trying to identify talent or evaluate
            players. The perspective is always from the family side of the
            fence.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            A note on the content
          </h2>

          <p>
            Football Parent currently covers around 50 topics across the areas
            described above. The site is updated as things change - the youth
            football pathway evolves, and outdated information does more harm
            than no information at all.
          </p>

          <p>
            If you have found something that seems out of date, or if there is a
            topic you think should be covered, the{" "}
            <Link
              href="/contact"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              contact page
            </Link>{" "}
            is the place to reach out.
          </p>

          <p className="pt-6 italic text-gray-600">
            Football Parent is an independent website. It is not affiliated with
            the FA, the Premier League, or any football club.
          </p>
        </div>
      </section>
    </main>
  );
}