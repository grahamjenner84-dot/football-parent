import Link from "next/link";

export const metadata = {
  title: "What Is EPPP in Football? A Parent's Guide | Football Parent",
  description: "EPPP stands for Elite Player Performance Plan. Here's what it means for your child's academy journey — explained clearly for parents, not coaches.",
};

export default function WhatIsEPPPPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-6 py-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/academy-pathway" className="hover:text-gray-900 transition-colors">Academy Pathway</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">What Is EPPP</span>
          </div>
        </nav>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Guide</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-gray-900">
            What Is EPPP in Football?
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-6">
            If your child has been invited to train with an academy, you'll come across the term EPPP fairly quickly. It stands for Elite Player Performance Plan, and it's the framework that governs how professional football academies in England operate.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-6">
            Introduced by the Premier League in 2012, it applies to professional clubs from the Premier League down to League Two that run youth academies. For parents, it explains a lot — why training hours are structured the way they are, how players can move between clubs, and what standards academies are required to meet.
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">By</span>
              <span className="font-medium text-gray-700">Football Parent</span>
            </div>
            <span className="text-gray-300">•</span>
            <span>Updated May 2026</span>
            <span className="text-gray-300">•</span>
            <span>10 min read</span>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row gap-12">
            
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="sticky top-8 bg-gray-50 rounded-lg p-6 space-y-4 max-h-screen overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">On this page</h3>
                <nav className="space-y-3 text-sm">
                  <a href="#matters" className="text-gray-600 hover:text-blue-700 transition-colors block">Why This Matters</a>
                  <a href="#glance" className="text-gray-600 hover:text-blue-700 transition-colors block">EPPP At a Glance</a>
                  <a href="#introduced" className="text-gray-600 hover:text-blue-700 transition-colors block">Why It Was Introduced</a>
                  <a href="#categories" className="text-gray-600 hover:text-blue-700 transition-colors block">The Category System</a>
                  <a href="#hours" className="text-gray-600 hover:text-blue-700 transition-colors block">Contact Hours by Phase</a>
                  <a href="#compensation" className="text-gray-600 hover:text-blue-700 transition-colors block">Compensation & Movement</a>
                  <a href="#faq" className="text-gray-600 hover:text-blue-700 transition-colors block">FAQ</a>
                </nav>
              </div>
            </aside>

            <article className="flex-1 max-w-2xl">
              <div className="space-y-12 text-gray-700 leading-relaxed">

                <section id="matters">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Why This Matters for You as a Parent</h2>
                  <p className="leading-8 mb-4">
                    The EPPP is not just administrative background. It directly affects:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mb-6 leading-8">
                    <li><strong>How many hours your child trains each week</strong> — regulated by phase and category</li>
                    <li><strong>Whether your child can play for their grassroots club</strong> — generally not, once registered</li>
                    <li><strong>What happens if a higher-category club wants to sign your child</strong> — a formal, compensated process</li>
                    <li><strong>What standards the academy must meet</strong> — coaching qualifications, welfare, education provision</li>
                  </ul>
                  <p className="leading-8">
                    Understanding the basics means you can ask better questions and follow the process with more confidence.
                  </p>
                </section>

                <section id="glance">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">EPPP at a Glance</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-left font-semibold">Element</th>
                          <th className="border border-gray-300 p-3 text-left font-semibold">What it covers</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-3 font-semibold">Academy categories</td>
                          <td className="border border-gray-300 p-3">Levels 1–4 based on audited facilities, staffing and hours</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 font-semibold">Contact hours</td>
                          <td className="border border-gray-300 p-3">Regulated minimum and maximum coaching time, by phase and category</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-3 font-semibold">Recruitment rules</td>
                          <td className="border border-gray-300 p-3">Catchment area limits by category; minimum registration age Under-9</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-3 font-semibold">Compensation</td>
                          <td className="border border-gray-300 p-3">Fixed, formula-based fees when a player moves between clubs of different categories</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-3 font-semibold">Welfare and education</td>
                          <td className="border border-gray-300 p-3">Minimum standards for safeguarding, player welfare and education support</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="introduced">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">Why the EPPP Was Introduced</h2>
                  <p className="leading-8 mb-4">
                    Before EPPP, there was no consistent national standard for youth football development. Coaching quality, training volume and compensation when players moved between clubs varied enormously across the professional game.
                  </p>
                  <p className="leading-8">
                    The EPPP was designed to raise standards — particularly at the top end — while giving clubs a consistent framework with protection for their investment in youth development.
                  </p>
                  <p className="leading-8 mt-4">
                    For context on where academies sit within this structure: <Link href="/academy-pathway/how-academy-football-works" className="text-blue-700 hover:text-blue-900 transition-colors">How Academy Football Works in the UK</Link>
                  </p>
                </section>

                <section id="categories">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">The Category System</h2>
                  <p className="leading-8 mb-6">
                    Every academy is audited and awarded a category from 1 to 4, based on facilities, staffing, coaching qualifications and hours delivered. Category determines:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mb-6 leading-8">
                    <li>The investment required from the club</li>
                    <li>How many contact hours players receive at each phase</li>
                    <li>The compensation fees payable when players move between clubs</li>
                    <li>The level of ongoing oversight and re-auditing</li>
                  </ul>
                  <p className="leading-8">
                    Full detail on what each category means in practice: <Link href="/academy-pathway/academy-categories-explained" className="text-blue-700 hover:text-blue-900 transition-colors">Category 1, 2, 3 and 4 Academies Explained</Link>
                  </p>
                </section>

                <section id="hours">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">Contact Hours by Phase</h2>
                  <p className="leading-8 mb-6">
                    The figures below are approximate and reflect Category 1 operation — lower-category clubs deliver fewer contact hours:
                  </p>
                  <ul className="list-disc list-inside space-y-3 mb-6 leading-8">
                    <li><strong>Foundation Phase (U9–U11):</strong> Around 4 hours of football activity per week at the highest-category clubs. This is lower than many parents expect, and is deliberate — EPPP was designed to prevent over-training at young ages.</li>
                    <li><strong>Youth Development Phase (U12–U16):</strong> Rising to roughly 10–12 hours per week at Category 1, spread across training sessions and match days.</li>
                    <li><strong>Professional Development Phase (U17+):</strong> Full-time training environments at top clubs.</li>
                  </ul>
                  <p className="leading-8 mb-4">
                    Lower-category clubs operate with fewer hours. For some families, this is actually less logistically demanding and better suited to a player who is still developing academically or physically.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p className="leading-8 text-sm">
                      <strong>Football Parent note:</strong> The contact hour figures in EPPP documentation describe the regulated parameters — not what every club actually delivers. Some clubs operate close to the maximum; others are more moderate. Ask a club specifically about weekly session commitments early on, rather than assuming based on category alone.
                    </p>
                  </div>
                </section>

                <section id="compensation">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">Compensation and Player Movement</h2>
                  <p className="leading-8 mb-4">
                    When a player moves from a lower-category club to a higher-category one, the receiving club pays a set compensation fee to the original club. These fees are formula-based and determined by the category of the club releasing the player — not through negotiation with families.
                  </p>
                  <p className="leading-8 mb-4">
                    This matters practically:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mb-6 leading-8">
                    <li>Lower-category clubs are aware their strongest players can be recruited away for fixed fees</li>
                    <li>Player movements between clubs involve formal processes — this is not simply a family's decision</li>
                    <li>Parents should always be kept informed during this process, but the negotiation happens between clubs</li>
                  </ul>
                  <p className="leading-8">
                    For recruitment timelines and when this typically becomes relevant: <Link href="/academy-pathway/what-age-do-football-academies-recruit" className="text-blue-700 hover:text-blue-900 transition-colors">What Age Do Football Academies Recruit?</Link>
                  </p>
                </section>

                <section>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">What EPPP Means Day to Day</h2>
                  <p className="leading-8 mb-4">
                    For most parents, the daily relevance of EPPP is about structure and expectations:
                  </p>
                  <ul className="list-disc list-inside space-y-2 leading-8">
                    <li>Training hours are regulated and should not be excessive at younger ages</li>
                    <li>Clubs must meet coaching and welfare standards to maintain their category</li>
                    <li>There are formal processes for registration, trials and player movement</li>
                  </ul>
                  <p className="leading-8 mt-4">
                    It doesn't mean every academy delivers identical experiences — Category 1 and Category 4 clubs are very different environments. But it does mean minimum standards exist across the system and clubs are accountable to them.
                  </p>
                </section>

                <section id="faq">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 pt-4">FAQ: EPPP Explained</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Does EPPP apply to all football clubs?</h3>
                      <p className="leading-8 text-sm">
                        No — only to professional clubs that operate Category 1–4 academies. Grassroots and amateur clubs operate under separate FA structures.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Can a club prevent my child from moving to a higher-category academy?</h3>
                      <p className="leading-8 text-sm">
                        Under EPPP, clubs cannot block a player from moving. However, the receiving club must pay the relevant compensation fee. The process is formal and handled between clubs.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">What is the EPPP audit process?</h3>
                      <p className="leading-8 text-sm">
                        Clubs are assessed against detailed criteria — facilities, coaching ratios, welfare procedures, hours delivered. Category status can be revised following audit, so a club's category can change over time. Always verify current status with the club directly.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Is there a difference between EPPP and the FA's grassroots talent pathways?</h3>
                      <p className="leading-8 text-sm">
                        Yes. EPPP governs professional club academies. The FA runs separate talent identification and development programmes at grassroots level — including county FA programmes — which operate alongside but independently of the EPPP structure.
                      </p>
                    </div>
                  </div>
                </section>

              </div>
            </article>
          </div>
        </div>
      </div>

      

      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-4xl">
            <div className="bg-gray-50 rounded-lg p-8 lg:p-10">
              <div className="flex gap-6 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Football Parent</h3>
                  <p className="text-gray-600">
                    Independent guidance for parents navigating the youth football system in the UK.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
