import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Check, X, FileText, Users, Calculator, Wrench, Scale, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?) | LevyLite",
  description: "An honest breakdown of strata manager duties in WA. Learn what adds real value, what's busywork, and when modern strata management software like LevyLite makes DIY viable for small schemes.",
  keywords: "strata manager duties, strata management software, what does strata manager do, strata manager responsibilities WA, DIY strata management",
  openGraph: {
    title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?)",
    description: "Honest breakdown of strata manager duties and when modern software makes DIY viable for small schemes.",
    type: "article",
  },
};

export default function WhatDoesStrataManagerDo() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#02667F] to-[#0090B7] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/blog" className="inline-flex items-center mb-6 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to blog
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What Does a Strata Manager Actually Do?
          </h1>
          <p className="text-xl text-white/90">
            And can software replace them? An honest assessment.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/80 mt-6">
            <span>Published 25 February 2026</span>
            <span>•</span>
            <span>7 min read</span>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            
            {/* Introduction */}
            <section className="mb-12">
              <p className="text-xl text-[#3A3A3A]/90 mb-6">
                Strata managers charge $2,000–$10,000 per year for small schemes. But what exactly are you paying for? And more importantly: could software do the same job for a fraction of the cost?
              </p>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                The answer isn't simple. Some of what managers do is genuinely valuable expertise. Some is pure busywork that software can automate. Let's break it down.
              </p>
            </section>

            {/* Core Duties */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                The Core Duties of a Strata Manager
              </h2>

              <div className="space-y-6">
                {/* Financial Management */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <div className="flex items-start gap-4 mb-4">
                    <Calculator className="w-8 h-8 text-[#02667F] flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#3A3A3A] mb-2">
                        1. Financial Management
                      </h3>
                      <p className="text-[#3A3A3A]/80 mb-4">
                        This is the bread-and-butter work that consumes most of a manager's time:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 ml-12">
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <strong className="text-[#3A3A3A]">Levy collection:</strong>
                        <span className="text-[#3A3A3A]/80"> Issue levy notices, track payments, chase overdue accounts</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <strong className="text-[#3A3A3A]">Budget preparation:</strong>
                        <span className="text-[#3A3A3A]/80"> Annual budgets for administrative and reserve funds</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <strong className="text-[#3A3A3A]">Creditor payments:</strong>
                        <span className="text-[#3A3A3A]/80"> Pay suppliers, tradespeople, insurance, utilities</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <strong className="text-[#3A3A3A]">Financial reporting:</strong>
                        <span className="text-[#3A3A3A]/80"> Monthly statements, annual reports, audit preparation</span>
                      </div>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-[#3A3A3A]/80">
                      <strong>💡 Can software replace this?</strong> <em>Mostly yes.</em> Automated levy reminders, payment tracking, and financial reports are exactly what modern strata software does best. The only human touch needed is approving supplier invoices.
                    </p>
                  </div>
                </Card>

                {/* Meeting Administration */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <div className="flex items-start gap-4 mb-4">
                    <Users className="w-8 h-8 text-[#02667F] flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#3A3A3A] mb-2">
                        2. Meeting Administration
                      </h3>
                      <p className="text-[#3A3A3A]/80 mb-4">
                        Organising AGMs and council meetings:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 ml-12">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Send meeting notices (14 days minimum for AGMs)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Prepare agendas and attach financial reports</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Take minutes during meetings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Distribute minutes and implement resolutions</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-[#3A3A3A]/80">
                      <strong>💡 Can software replace this?</strong> <em>Partially.</em> Software can generate notice templates and agendas, but someone still needs to attend the meeting and take minutes. For small schemes, the council secretary can handle this.
                    </p>
                  </div>
                </Card>

                {/* Maintenance Coordination */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <div className="flex items-start gap-4 mb-4">
                    <Wrench className="w-8 h-8 text-[#02667F] flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#3A3A3A] mb-2">
                        3. Maintenance Coordination
                      </h3>
                      <p className="text-[#3A3A3A]/80 mb-4">
                        Acting as the go-between for owners and tradespeople:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 ml-12">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Arrange quotes for repairs and maintenance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Engage contractors and manage projects</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Inspect completed work and approve payment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Handle emergency repairs (burst pipes, storm damage)</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-[#3A3A3A]/80">
                      <strong>⚠️ Can software replace this?</strong> <em>No.</em> This requires local knowledge, judgment, and relationship management. Software can track work orders and quotes, but someone needs to make the calls and inspect the work. This is where managers add genuine value.
                    </p>
                  </div>
                </Card>

                {/* Legal & Compliance */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <div className="flex items-start gap-4 mb-4">
                    <Scale className="w-8 h-8 text-[#02667F] flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#3A3A3A] mb-2">
                        4. Legal & Compliance
                      </h3>
                      <p className="text-[#3A3A3A]/80 mb-4">
                        Ensuring the scheme complies with the Strata Titles Act:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 ml-12">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Maintain the strata roll (owner contact details)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Keep minutes and records for 7 years</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Arrange insurance renewals</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Handle by-law breaches and disputes</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-[#3A3A3A]/80">
                      <strong>💡 Can software replace this?</strong> <em>Mostly yes.</em> Record-keeping is software's forte. Dispute resolution, however, requires human judgment—though in small harmonious schemes, disputes are rare.
                    </p>
                  </div>
                </Card>

                {/* Owner Communication */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <div className="flex items-start gap-4 mb-4">
                    <FileText className="w-8 h-8 text-[#02667F] flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-bold text-[#3A3A3A] mb-2">
                        5. Owner Communication
                      </h3>
                      <p className="text-[#3A3A3A]/80 mb-4">
                        The daily grind of correspondence:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 ml-12">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Answer owner queries about levies, maintenance, by-laws</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Provide statements and records on request</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-[#3A3A3A]/80">Issue newsletters and update notices</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-[#3A3A3A]/80">
                      <strong>💡 Can software replace this?</strong> <em>Mostly yes.</em> Owner portals let owners access their own statements and documents 24/7, dramatically reducing email volume. Simple queries answer themselves.
                    </p>
                  </div>
                </Card>
              </div>
            </section>

            {/* When Managers Add Real Value */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                When Managers Add Real Value
              </h2>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                Strata managers are worth their fees when your scheme has:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Complex Facilities</h3>
                  <p className="text-[#3A3A3A]/80">
                    Pools, lifts, CCTV systems, commercial tenancies. These require regular contractor liaison, compliance checks, and specialist knowledge.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Large Schemes</h3>
                  <p className="text-[#3A3A3A]/80">
                    Over 50 lots. The admin volume alone justifies a professional. You're not paying for expertise; you're paying for someone to exist full-time.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Contentious Schemes</h3>
                  <p className="text-[#3A3A3A]/80">
                    Ongoing disputes, by-law breaches, or owners who don't get along. Managers act as neutral mediators and lightning rods for complaints.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Major Projects</h3>
                  <p className="text-[#3A3A3A]/80">
                    Building remediation, roof replacement, major upgrades. Project management experience is invaluable when dealing with six-figure contracts.
                  </p>
                </Card>
              </div>
            </section>

            {/* When Software Makes Sense */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                When Software Makes More Sense
              </h2>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                For small, simple schemes, modern strata software can replace 80% of what a manager does:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Under 20 Lots</h3>
                  <p className="text-[#3A3A3A]/80">
                    Admin volume is low enough that council members can handle it with software assistance. One person spending 2 hours a week beats $5K/year in fees.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Minimal Shared Facilities</h3>
                  <p className="text-[#3A3A3A]/80">
                    No pools, lifts, or gyms. Just basic building maintenance and gardening. Software handles levy collection; owners coordinate simple repairs themselves.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Harmonious Owners</h3>
                  <p className="text-[#3A3A3A]/80">
                    No ongoing disputes or personality clashes. Everyone just wants things to work smoothly with minimal fuss and cost.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Tech-Comfortable Council</h3>
                  <p className="text-[#3A3A3A]/80">
                    At least one owner is happy to spend an hour or two per quarter managing an online portal. No need for deep technical skills—just basic computer literacy.
                  </p>
                </Card>
              </div>
            </section>

            {/* The Honest Assessment */}
            <section className="mb-12">
              <Card className="p-8 bg-gradient-to-r from-[#02667F]/5 to-[#0090B7]/5 border-l-4 border-[#02667F]">
                <h2 className="text-3xl font-bold text-[#3A3A3A] mb-4">
                  The Honest Assessment
                </h2>
                <p className="text-lg text-[#3A3A3A]/80 mb-4">
                  <strong>What managers do well:</strong> Project management, dispute resolution, contractor relationships, compliance expertise for complex schemes.
                </p>
                <p className="text-lg text-[#3A3A3A]/80 mb-4">
                  <strong>What software does better:</strong> Levy tracking, payment reminders, financial reports, owner portals, meeting templates, record-keeping.
                </p>
                <p className="text-lg text-[#3A3A3A]/80">
                  <strong>The truth:</strong> For schemes under 20 lots with no complex facilities, you're probably paying $3,000–$6,000 per year for work that software can automate for $200–$800. The catch? You need at least one owner willing to be the "software operator"—checking in weekly, approving invoices, coordinating simple repairs.
                </p>
              </Card>
            </section>

            {/* Try LevyLite CTA */}
            <section className="mb-12">
              <Card className="p-8 bg-white border-2 border-[#02667F]">
                <h2 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                  Want to Try Software-Assisted Self-Management?
                </h2>
                <p className="text-lg text-[#3A3A3A]/80 mb-6">
                  LevyLite is purpose-built for small WA strata schemes. Automated levy reminders, owner portal, AGM templates, and 10-year reserve planning. Free for schemes up to 5 lots, then from $0.75/lot/month.
                </p>
                <Link 
                  href="/" 
                  className="inline-block bg-[#02667F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#024d5f] transition-colors"
                >
                  Get early access to LevyLite
                </Link>
              </Card>
            </section>

          </div>
        </div>
      </article>

      {/* Related Posts */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#3A3A3A] mb-8">Related Guides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/blog/how-to-self-manage-strata-wa">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full border-l-4 border-[#02667F]">
                <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">
                  How to Self-Manage Your Strata in WA
                </h3>
                <p className="text-[#3A3A3A]/80">
                  Step-by-step guide to managing your scheme without paying thousands in fees.
                </p>
              </Card>
            </Link>
            <Link href="/blog/strata-management-costs-wa">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full border-l-4 border-[#02667F]">
                <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">
                  Strata Management Costs in WA
                </h3>
                <p className="text-[#3A3A3A]/80">
                  A transparent breakdown of what you're paying for and if it's worth it.
                </p>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
