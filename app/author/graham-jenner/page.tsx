import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Graham Jenner | Football Parent",
  description:
    "Graham Jenner is the founder of Football Parent. A football parent and grassroots coach sharing first-hand experience of navigating youth football pathways in the UK.",
  alternates: {
    canonical: "https://www.footballparent.co.uk/author/graham-jenner",
  },
};

export default function GrahamJennerAuthorPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <p className="text-sm font-semibold text-blue-700 mb-4">
            Founder of Football Parent
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            About Graham Jenner
          </h1>

          <p className="text-lg text-gray-700 leading-relaxed">
            I&apos;m Graham Jenner - football parent, grassroots coach, and the
            person behind Football Parent.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <div className="space-y-6 text-gray-700 text-lg leading-8">
          <p>
            I didn&apos;t start this website because I had all the answers. I
            started it because I had too many questions and nowhere useful to
            look for them.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            How this started
          </h2>

          <p>
            When my son first got involved in youth football, I quickly realised
            how little straightforward information was out there for parents.
            Everything felt either overly technical, written for coaches rather
            than families, or buried inside Facebook groups where the same
            questions got asked repeatedly.
          </p>

          <p>
            The moment he was invited to attend a development centre, I
            genuinely didn&apos;t know what to expect. What would sessions
            involve? What were the coaches looking for? How should we approach
            it as a family? What happened next if things went well - or if they
            didn&apos;t?
          </p>

          <p>That gap was the starting point for Football Parent.</p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            My background
          </h2>

          <p>
            I&apos;m not a former professional footballer. I&apos;ve never
            worked for an academy and I&apos;ve never been a scout. I&apos;m a
            football parent who has spent years navigating the same system that
            many families are navigating now.
          </p>

          <p>
            My son attended Crystal Palace&apos;s Development Centre, as well as
            both Chelsea&apos;s Player Training Centre and their Player
            Development Centre. Each environment was different, with its own
            expectations, culture and impact on him - and on us as a family.
          </p>

          <p>
            Alongside being a parent, I&apos;ve also coached. I took my
            son&apos;s grassroots team from under-6s to under-8s and found it
            one of the most rewarding things I&apos;ve done. I also hold an FA
            Level 2 coaching qualification, but the real education has come from
            the pitchside and from being a parent in the system.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            What I write about
          </h2>

          <p>
            Football Parent is focused on the journey that football families go
            through - the parts that are not always explained clearly.
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Football academies and how they work</li>
            <li>Development centres and what parents should expect</li>
            <li>Academy trials and how to approach them</li>
            <li>Player development and long-term progress</li>
            <li>Girls&apos; football pathways</li>
            <li>Football parenting, expectations and enjoyment</li>
          </ul>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            My editorial approach
          </h2>

          <p>
            I don&apos;t claim to have insider knowledge of how academies make
            their decisions. I&apos;m not positioned inside the professional
            game and I don&apos;t pretend to be.
          </p>

          <p>
            What I do have is first-hand experience, a willingness to research
            carefully, and a commitment to being honest about what I know and
            what I don&apos;t. Where things vary between clubs, I say so. I
            would rather acknowledge the complexity than give parents false
            confidence.
          </p>

          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 pt-8">
            Who I&apos;m writing for
          </h2>

          <p>
            Football Parent is written for the parent on the touchline who wants
            to support their child without getting in the way. The family who
            has just had a letter about a development centre and is not sure
            what it means. The parent whose child is disappointed after a trial
            or release and needs honest perspective rather than empty
            reassurance.
          </p>

          <p>
            I&apos;m not here to sell coaching programmes or tell you your child
            is destined for greatness. I&apos;m here to help you understand the
            system, make informed decisions, and keep football enjoyable for
            your family - whatever level your child plays at.
          </p>



          <p className="pt-6 italic text-gray-600">
            Graham Jenner is the founder of Football Parent.
          </p>
        </div>
      </section>
    </main>
  );
}