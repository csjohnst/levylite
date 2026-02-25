import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle, FileText, Users, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import Image from "next/image";

export const metadata = {
  title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide | LevyLite",
  description: "Practical guide to self-managing your strata scheme in Western Australia. Learn the legal requirements under the Strata Titles Act 1985, responsibilities, and tools you need to manage levies, meetings, and records without paying management fees.",
  keywords: "self managed strata WA, how to self manage strata, strata self management Western Australia, DIY strata management, Strata Titles Act 1985",
  openGraph: {
    title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide",
    description: "Practical guide to self-managing your strata scheme in Western Australia without paying thousands in management fees.",
    type: "article",
  },
};

export default function SelfManageStrataWA() {
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
            How to Self-Manage Your Strata in WA
          </h1>
          <p className="text-xl text-white/90">
            A step-by-step guide to managing your scheme without paying thousands in fees
          </p>
          <div className="flex items-center gap-4 text-sm text-white/80 mt-6">
            <span>Published 25 February 2026</span>
            <span>•</span>
            <span>8 min read</span>
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
                Professional strata management can cost $2,000–$10,000 per year for small schemes in Western Australia. For a 6-lot complex, that's $300–$1,600 per owner annually—often more than your scheme actually needs.
              </p>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                If your scheme is small (under 20 lots), relatively harmonious, and doesn't have complex commercial elements, self-management is absolutely viable. Here's how to do it properly.
              </p>
            </section>

            {/* Legal Requirements */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                What the Law Requires
              </h2>
              <Card className="p-6 border-l-4 border-[#02667F] mb-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-[#02667F] mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">
                      Strata Titles Act 1985 (WA)
                    </h3>
                    <p className="text-[#3A3A3A]/80">
                      The Act governs all strata schemes in Western Australia. Self-managed schemes must comply with the same obligations as professionally managed ones.
                    </p>
                  </div>
                </div>
              </Card>

              <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">Core Legal Obligations</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <Users className="w-6 h-6 text-[#02667F] flex-shrink-0" />
                    <h4 className="text-lg font-bold text-[#3A3A3A]">Annual General Meeting (AGM)</h4>
                  </div>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Hold within 15 months of the last AGM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Provide 14 days' notice to all owners</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Elect a council if 4+ lots</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <DollarSign className="w-6 h-6 text-[#02667F] flex-shrink-0" />
                    <h4 className="text-lg font-bold text-[#3A3A3A]">Financial Management</h4>
                  </div>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Maintain an administrative fund</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Maintain a reserve fund (10-year plan)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Keep proper financial records</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <FileText className="w-6 h-6 text-[#02667F] flex-shrink-0" />
                    <h4 className="text-lg font-bold text-[#3A3A3A]">Record Keeping</h4>
                  </div>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Strata roll (owner contact details)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Meeting minutes and resolutions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Financial statements</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-[#02667F] flex-shrink-0" />
                    <h4 className="text-lg font-bold text-[#3A3A3A]">Insurance</h4>
                  </div>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Building insurance (mandatory)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Public liability insurance (recommended)</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Step-by-Step Guide */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Step-by-Step: Your First Year Self-Managing
              </h2>

              <div className="space-y-8">
                {/* Step 1 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 1: Appoint a Council (if 4+ lots)
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    At your first AGM, elect a council. For schemes under 20 lots, a simple 3-person council works well: Chairperson, Secretary, and Treasurer.
                  </p>
                  <p className="text-[#3A3A3A]/80">
                    <strong>Tip:</strong> Rotate roles annually so knowledge doesn't get siloed with one owner.
                  </p>
                </Card>

                {/* Step 2 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 2: Open a Strata Bank Account
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    Open a dedicated bank account in the name of your strata company (e.g., "Strata Company 12345"). You'll need two signatories for transactions—typically the Chairperson and Treasurer.
                  </p>
                  <p className="text-[#3A3A3A]/80">
                    <strong>What you'll need:</strong> Certificate of Title, strata plan number, council resolution authorizing the account.
                  </p>
                </Card>

                {/* Step 3 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 3: Set Your Levy Budget
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    Calculate annual expenses (insurance, maintenance, utilities, admin) and divide by the number of lots (adjusted for lot entitlements). Set levies quarterly or annually.
                  </p>
                  <p className="text-[#3A3A3A]/80 mb-3">
                    <strong>Don't forget:</strong>
                  </p>
                  <ul className="space-y-2 text-[#3A3A3A]/80 ml-6">
                    <li>• Administrative fund (day-to-day expenses)</li>
                    <li>• Reserve fund (long-term capital works—roofs, painting, etc.)</li>
                  </ul>
                </Card>

                {/* Step 4 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 4: Track Levy Payments
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    This is where self-management gets tedious with spreadsheets. You need to:
                  </p>
                  <ul className="space-y-2 text-[#3A3A3A]/80 ml-6 mb-4">
                    <li>• Send levy notices to all owners</li>
                    <li>• Track who's paid and who hasn't</li>
                    <li>• Chase overdue payments (diplomatically)</li>
                    <li>• Generate owner statements on request</li>
                  </ul>
                  <p className="text-[#3A3A3A]/80">
                    <strong>Reality check:</strong> This is the #1 reason schemes hire managers. Automated software makes this dramatically easier.
                  </p>
                </Card>

                {/* Step 5 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 5: Schedule Your AGM
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    Give 14 days' written notice. Your agenda must include:
                  </p>
                  <ul className="space-y-2 text-[#3A3A3A]/80 ml-6 mb-4">
                    <li>• Financial statements for the previous year</li>
                    <li>• Budget for the coming year</li>
                    <li>• Election of council members</li>
                    <li>• Any motions from owners</li>
                  </ul>
                  <p className="text-[#3A3A3A]/80">
                    <strong>Tip:</strong> Keep meetings short. Small schemes don't need hour-long deliberations.
                  </p>
                </Card>

                {/* Step 6 */}
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    Step 6: Maintain Records
                  </h3>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    You're legally required to keep records and make them available to owners on request. At minimum:
                  </p>
                  <ul className="space-y-2 text-[#3A3A3A]/80 ml-6">
                    <li>• Strata roll (owner details, lot entitlements)</li>
                    <li>• Meeting minutes from the past 7 years</li>
                    <li>• Financial records</li>
                    <li>• Insurance policies</li>
                    <li>• Building plans and by-laws</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Reality Check */}
            <section className="mb-12">
              <Card className="p-8 bg-amber-50 border-l-4 border-amber-500">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-2xl font-bold text-[#3A3A3A] mb-3">
                      The Reality Check
                    </h3>
                    <p className="text-[#3A3A3A]/80 mb-4">
                      Self-management works brilliantly for schemes with:
                    </p>
                    <ul className="space-y-2 text-[#3A3A3A]/80 ml-6 mb-4">
                      <li>• Under 20 lots</li>
                      <li>• Minimal shared facilities (no pools, lifts, or gyms)</li>
                      <li>• Owners who get along reasonably well</li>
                      <li>• At least one owner willing to wrangle paperwork</li>
                    </ul>
                    <p className="text-[#3A3A3A]/80">
                      If your scheme is contentious, has complex facilities, or everyone's too busy, a professional manager might be worth the cost.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Tools Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Tools That Make Self-Management Easier
              </h2>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                You don't need enterprise software. Simple tools designed for small operators work best:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Spreadsheets</h3>
                  <p className="text-[#3A3A3A]/80 mb-3">
                    <strong>Good for:</strong> Basic levy tracking, budgets
                  </p>
                  <p className="text-[#3A3A3A]/80">
                    <strong>Pain point:</strong> Manual emails, no payment reminders, version control chaos
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Xero or MYOB</h3>
                  <p className="text-[#3A3A3A]/80 mb-3">
                    <strong>Good for:</strong> Proper accounting, financial reports
                  </p>
                  <p className="text-[#3A3A3A]/80">
                    <strong>Pain point:</strong> Not purpose-built for strata, still manual owner communication
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">LevyLite</h3>
                  <p className="text-[#3A3A3A]/80 mb-3">
                    <strong>Built for:</strong> Small WA strata schemes (under 50 lots)
                  </p>
                  <p className="text-[#3A3A3A]/80 mb-3">
                    Automated levy reminders, owner portal, AGM templates, 10-year reserve planning. Starts free for schemes up to 5 lots.
                  </p>
                  <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 text-[#02667F] font-semibold hover:underline"
                  >
                    Learn more about LevyLite
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Link>
                </Card>
              </div>
            </section>

            {/* Final Thoughts */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Final Thoughts
              </h2>
              <p className="text-lg text-[#3A3A3A]/80 mb-4">
                Self-management isn't for everyone, and that's okay. But if your scheme is small, simple, and you're willing to invest a few hours every quarter, you can save thousands annually.
              </p>
              <p className="text-lg text-[#3A3A3A]/80">
                The key is using the right tools to automate tedious work (levy tracking, reminders, owner communication) while keeping the meaningful decisions in your hands.
              </p>
            </section>

          </div>
        </div>
      </article>

      {/* Related Posts */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#3A3A3A] mb-8">Related Guides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/blog/what-does-strata-manager-do">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full border-l-4 border-[#02667F]">
                <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">
                  What Does a Strata Manager Actually Do?
                </h3>
                <p className="text-[#3A3A3A]/80">
                  Understanding the real value of strata managers and when software makes more sense.
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
