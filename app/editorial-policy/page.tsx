import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editorial Policy | Football Parent",
  description:
    "How Football Parent researches, writes, fact-checks and updates content. Our commitment to independent, honest guidance for football families.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/editorial-policy",
  },
};

export default function EditorialPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Football Parent
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Editorial Policy
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            How Football Parent researches, writes, fact-checks and updates
            content for football families.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            Football Parent is an independent website. The guidance here is
            shaped by one question: what does a football parent actually need to
            know?
          </p>

          <p>
            This page explains how content is researched, written, reviewed and
            maintained — and what our commitment to independence means in
            practice.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Mission
          </h2>

          <p>
            Football Parent exists to give UK football families clear, honest,
            independent guidance on navigating the youth football pathway.
          </p>

          <p>
            We are not affiliated with any club, academy, coaching provider or
            agent service. We do not write to reflect well on any organisation
            and we are not paid to reach particular conclusions.
          </p>

          <p>
            The site may be funded through affiliate income from relevant
            product recommendations. That commercial activity does not influence
            editorial content.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            How we research content
          </h2>

          <p>Most articles on Football Parent draw on a combination of:</p>

          <p>
            <strong>First-hand experience.</strong> The site is founded and
            primarily written by Graham Jenner, a football parent whose son has
            attended development centres run by Crystal Palace and Chelsea.
            Where content draws on that experience directly, it is written as
            such.
          </p>

          <p>
            <strong>Published guidance from trusted football organisations.</strong>{" "}
            This includes material from the FA, the Premier League, the English
            Football League and other relevant football bodies. Where official
            documentation is referenced, it is linked where publicly available.
          </p>

          <p>
            <strong>Publicly available club and academy information.</strong>{" "}
            Club websites, official academy information and published policies
            are used to provide accurate and current information about specific
            programmes.
          </p>

          <p>
            <strong>Other football parents.</strong> Conversations with parents
            inform the kinds of questions this site addresses. No individual
            parent&apos;s experience is treated as universally representative.
          </p>

          <p>
            We do not rely on anonymous sources or unverified claims. Where
            something is uncertain or varies between clubs, we say so clearly.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Source standards
          </h2>

          <p>We prioritise:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Official FA documentation and published guidance</li>
            <li>Premier League and EFL EPPP framework documents</li>
            <li>Statements and published information from clubs and academies</li>
            <li>
              Academic or sporting science research from recognised institutions
            </li>
            <li>Reputable sports journalism from established UK outlets</li>
          </ul>

          <p>We are sceptical of:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Unattributed claims</li>
            <li>Social media posts as primary sources</li>
            <li>Forum opinion presented as fact</li>
            <li>
              Commercially motivated information from parties with a financial
              interest
            </li>
          </ul>

          <p>
            When a source is used to support a factual claim, it is either linked
            directly or described clearly enough that a reader could verify it.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Fact-checking
          </h2>

          <p>
            Before publication, factual claims are checked against at least one
            primary source wherever possible. For content covering rules,
            eligibility criteria or official processes, we check against the most
            current published version of the relevant governing body
            documentation.
          </p>

          <p>
            Where we cannot verify a claim, we either omit it or make clear that
            it is uncertain.
          </p>

          <p>
            We acknowledge that the youth football system changes. Age group
            requirements, programme structures and club offerings evolve over
            time. Readers should verify current details directly with the
            relevant club or organisation before making decisions.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Article review process
          </h2>

          <p>
            Articles are written and reviewed by Graham Jenner. Football Parent
            is currently a single-author site, and we are transparent about that.
          </p>

          <p>
            Every piece of content published here represents a considered
            editorial decision. Nothing is published simply to hit a content
            quota.
          </p>

          <h2
            id="corrections"
            className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8"
          >
            Corrections policy
          </h2>

          <p>
            If something on this site is factually wrong, we want to know.
            Accuracy matters more than protecting what has already been
            published.
          </p>

          <p>
            To report an error, use the{" "}
            <Link
              href="/contact"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              contact page
            </Link>{" "}
            and describe the specific claim you believe to be incorrect.
          </p>

          <p>If a factual error is confirmed, we will:</p>

          <ol className="list-decimal pl-6 space-y-2">
            <li>Correct the article promptly</li>
            <li>
              Add a brief note where the change is substantive and useful for
              readers
            </li>
            <li>Update the article&apos;s review or modified date where used</li>
          </ol>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Update policy
          </h2>

          <p>
            Youth football information can become outdated. Programme names
            change, clubs restructure development setups and official guidance
            can be revised.
          </p>

          <p>
            We aim to review high-traffic and time-sensitive articles, such as
            content about development centres, trial processes or age group
            rules, at least once a year or sooner if we become aware of relevant
            changes.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Independence statement
          </h2>

          <p>
            Football Parent is not affiliated with, sponsored by or editorially
            influenced by any football club, academy, coaching company, agency
            or commercial organisation in the football industry.
          </p>

          <p>
            Content is not written in exchange for access to clubs or academies,
            and we do not accept payment to produce or modify editorial content.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Affiliate disclosure
          </h2>

          <p>
            Football Parent may earn commission on some purchases made through
            links on this site. This applies primarily to product
            recommendations, such as football boots, training equipment or
            relevant books.
          </p>

          <p>
            Affiliate income helps fund the running of the site. It does not
            influence what is recommended. Where an affiliate link is used, it
            should be disclosed within the relevant content.
          </p>

          <p>
            Affiliate relationships do not extend to clubs, academies, coaching
            providers or any football organisation. No editorial content is
            written in exchange for commission or referral income.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Contact
          </h2>

          <p>
            To report an error, suggest a correction, ask about a topic or raise
            a concern about any content on the site, please use the{" "}
            <Link
              href="/contact"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              contact page
            </Link>
            .
          </p>

          <p className="pt-6 italic text-gray-600">
            Last reviewed: June 2026
          </p>
        </div>
      </section>
    </main>
  );
}