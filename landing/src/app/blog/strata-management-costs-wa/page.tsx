import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DollarSign, Calculator, TrendingUp, AlertCircle, ArrowLeft, Check } from "lucide-react";

export const metadata = {
  title: "Strata Management Costs in WA: What You're Really Paying For | LevyLite",
  description: "Transparent breakdown of strata management fees in Western Australia. Learn what's included in typical $2K-$10K annual costs for small schemes, what's extra, and how to calculate if you're getting value for money.",
  keywords: "strata management fees WA, strata management costs, strata manager fees Western Australia, how much does strata management cost, strata fees breakdown",
  openGraph: {
    title: "Strata Management Costs in WA: What You're Really Paying For",
    description: "Transparent breakdown of strata management fees in WA and what you're actually paying for.",
    type: "article",
  },
};

export default function StrataManagementCostsWA() {
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
            Strata Management Costs in WA
          </h1>
          <p className="text-xl text-white/90">
            What you're really paying for—and if it's worth it
          </p>
          <div className="flex items-center gap-4 text-sm text-white/80 mt-6">
            <span>Published 25 February 2026</span>
            <span>•</span>
            <span>6 min read</span>
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
                Strata management fees in Western Australia vary wildly—from $1,500 to $15,000+ per year for the same sized scheme. Why the huge range? And more importantly: are you getting value for money?
              </p>
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                Let's break down exactly what you're paying for, what's typically extra, and how to calculate the real cost per lot.
              </p>
            </section>

            {/* Typical Fee Structures */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Typical Fee Structures in WA
              </h2>
              
              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                Most strata managers in WA charge one of three ways:
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Per-Lot Annual Fee</h3>
                  <div className="text-3xl font-bold text-[#02667F] mb-3">$150–$450</div>
                  <p className="text-sm text-[#3A3A3A]/80">per lot per year</p>
                  <p className="text-[#3A3A3A]/80 mt-3">
                    Common for schemes under 50 lots. Simple to understand: 10 lots × $250 = $2,500/year total.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Flat Annual Fee</h3>
                  <div className="text-3xl font-bold text-[#02667F] mb-3">$2,000–$10,000</div>
                  <p className="text-sm text-[#3A3A3A]/80">per scheme per year</p>
                  <p className="text-[#3A3A3A]/80 mt-3">
                    More common for tiny schemes (under 10 lots) where per-lot pricing doesn't cover their minimum viable fee.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Percentage of Levy</h3>
                  <div className="text-3xl font-bold text-[#02667F] mb-3">8–15%</div>
                  <p className="text-sm text-[#3A3A3A]/80">of total levy income</p>
                  <p className="text-[#3A3A3A]/80 mt-3">
                    Less common in WA. Creates perverse incentive to increase levies, so most managers avoid it.
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-amber-50 border-l-4 border-amber-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">The "Minimum Fee" Trap</h3>
                    <p className="text-[#3A3A3A]/80">
                      Many managers advertise "$250/lot" but have a "$3,500 minimum". For a 6-lot scheme, you're not paying $1,500 (6 × $250)—you're paying the full $3,500. That's actually $583 per lot. Always ask about minimums.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* What's Included */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                What's Typically Included in Base Fees
              </h2>

              <Card className="p-6 mb-6">
                <h3 className="text-xl font-bold text-[#3A3A3A] mb-4">Standard Services</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Levy collection and payment tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Financial reporting (monthly/quarterly)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Annual AGM coordination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Meeting minutes and notices</span>
                    </li>
                  </ul>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Supplier payment processing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Record keeping and strata roll</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Insurance renewal coordination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[#3A3A3A]/80">Basic owner correspondence</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* Extra Charges */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                What Often Costs Extra
              </h2>

              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                This is where costs can blow out. Many managers charge additional fees for:
              </p>

              <div className="space-y-4 mb-8">
                <Card className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#3A3A3A]">Extra Council Meetings</h3>
                    <span className="text-[#02667F] font-bold">$150–$400</span>
                  </div>
                  <p className="text-[#3A3A3A]/80">
                    Base fee typically includes one AGM. Additional meetings (EGMs, council meetings) are often charged per meeting.
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#3A3A3A]">Document Requests</h3>
                    <span className="text-[#02667F] font-bold">$50–$200</span>
                  </div>
                  <p className="text-[#3A3A3A]/80">
                    When owners request records, statements, or Section 51 certificates (required for property sales). Some managers charge per request.
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#3A3A3A]">Debt Collection</h3>
                    <span className="text-[#02667F] font-bold">10–20%</span>
                  </div>
                  <p className="text-[#3A3A3A]/80">
                    Some managers charge a percentage of recovered debts when chasing overdue levies through legal channels.
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#3A3A3A]">Project Management</h3>
                    <span className="text-[#02667F] font-bold">5–15%</span>
                  </div>
                  <p className="text-[#3A3A3A]/80">
                    For major works (roof replacement, repainting), managers often charge a percentage of the project cost on top of their base fee.
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#3A3A3A]">Dispute Resolution</h3>
                    <span className="text-[#02667F] font-bold">$150–$300/hr</span>
                  </div>
                  <p className="text-[#3A3A3A]/80">
                    Time spent mediating owner disputes, by-law breaches, or attending tribunal hearings.
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-red-50 border-l-4 border-red-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">Hidden Costs Add Up Fast</h3>
                    <p className="text-[#3A3A3A]/80">
                      A scheme paying "$3,000 base fee" can easily spend an extra $1,000–$2,000 per year on extras. Always ask for a complete fee schedule and compare true annual costs, not just the base rate.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Real Examples */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Real Cost Examples (Small WA Schemes)
              </h2>

              <div className="space-y-6">
                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-3">6-Lot Complex (Suburban Perth)</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>Base management fee ($250/lot minimum $3,500)</span>
                      <span className="font-semibold">$3,500</span>
                    </div>
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>1 extra council meeting</span>
                      <span className="font-semibold">$250</span>
                    </div>
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>3 document requests (property sales)</span>
                      <span className="font-semibold">$450</span>
                    </div>
                    <div className="border-t-2 border-[#3A3A3A]/20 my-3"></div>
                    <div className="flex justify-between text-xl font-bold text-[#3A3A3A]">
                      <span>Total annual cost</span>
                      <span>$4,200</span>
                    </div>
                    <div className="flex justify-between text-lg text-[#02667F] font-semibold">
                      <span>Cost per lot</span>
                      <span>$700/year</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#3A3A3A]/80">
                    That's $58 per month per owner for someone else to handle levy collection and meetings.
                  </p>
                </Card>

                <Card className="p-6 border-l-4 border-[#02667F]">
                  <h3 className="text-2xl font-bold text-[#3A3A3A] mb-3">16-Lot Complex (Regional WA)</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>Base management fee ($280/lot)</span>
                      <span className="font-semibold">$4,480</span>
                    </div>
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>2 extra meetings</span>
                      <span className="font-semibold">$500</span>
                    </div>
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>Painting project management (5% of $40K)</span>
                      <span className="font-semibold">$2,000</span>
                    </div>
                    <div className="flex justify-between text-[#3A3A3A]/80">
                      <span>5 document requests</span>
                      <span className="font-semibold">$750</span>
                    </div>
                    <div className="border-t-2 border-[#3A3A3A]/20 my-3"></div>
                    <div className="flex justify-between text-xl font-bold text-[#3A3A3A]">
                      <span>Total annual cost</span>
                      <span>$7,730</span>
                    </div>
                    <div className="flex justify-between text-lg text-[#02667F] font-semibold">
                      <span>Cost per lot</span>
                      <span>$483/year</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#3A3A3A]/80">
                    Major project year inflated costs. Base year would be closer to $350/lot ($5,730 total).
                  </p>
                </Card>
              </div>
            </section>

            {/* Value Assessment */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Are You Getting Value for Money?
              </h2>

              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                Here's how to assess if your management fees are justified:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Good Value Indicators</h3>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Prompt levy collection (low arrears)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Clear monthly financial reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Responsive to owner queries (24-48hr)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Proactive maintenance coordination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Compliance with legal obligations</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6 border-l-4 border-red-500">
                  <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">Red Flags</h3>
                  <ul className="space-y-2 text-[#3A3A3A]/80">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>High levy arrears (poor collection)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Delayed or unclear financial reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Slow to respond (week+ turnaround)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Surprise extra charges not disclosed upfront</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Council always chasing them for updates</span>
                    </li>
                  </ul>
                </Card>
              </div>

              <Card className="p-6 bg-blue-50 border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-[#3A3A3A] mb-3">The Simple Test</h3>
                <p className="text-[#3A3A3A]/80 mb-3">
                  Calculate your total annual cost (base + extras) and divide by the number of lots. Then ask:
                </p>
                <p className="text-lg font-semibold text-[#3A3A3A] mb-3">
                  "Would I pay someone $X per month to handle this paperwork?"
                </p>
                <p className="text-[#3A3A3A]/80">
                  If the answer is yes and your manager is competent, you're getting value. If the answer is "hell no" or your manager is consistently dropping the ball, it's time to shop around—or consider self-management.
                </p>
              </Card>
            </section>

            {/* Alternative: Software */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                The Alternative: Modern Software
              </h2>

              <p className="text-lg text-[#3A3A3A]/80 mb-6">
                For small schemes (under 20 lots), purpose-built strata software can replace most of what you're paying for:
              </p>

              <Card className="p-6 border-l-4 border-[#02667F] mb-6">
                <h3 className="text-2xl font-bold text-[#3A3A3A] mb-4">LevyLite Cost Comparison</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-bold text-[#3A3A3A] mb-3">Traditional Manager (6 lots)</h4>
                    <div className="space-y-2 text-[#3A3A3A]/80">
                      <div className="flex justify-between">
                        <span>Annual cost</span>
                        <span className="font-semibold">$3,500–$5,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per lot/month</span>
                        <span className="font-semibold">$49–$69</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#02667F] mb-3">LevyLite Software (6 lots)</h4>
                    <div className="space-y-2 text-[#3A3A3A]/80">
                      <div className="flex justify-between">
                        <span>Annual cost</span>
                        <span className="font-semibold text-[#02667F]">$54</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per lot/month</span>
                        <span className="font-semibold text-[#02667F]">$0.75</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-[#3A3A3A]/20">
                  <p className="text-xl font-bold text-[#02667F] mb-2">
                    Annual savings: $3,446–$4,946
                  </p>
                  <p className="text-[#3A3A3A]/80">
                    You still need someone to spend 1-2 hours per week as the "software operator", but the time saved on manual levy tracking and owner communication typically pays for itself.
                  </p>
                </div>
              </Card>

              <div className="text-center">
                <Link 
                  href="/" 
                  className="inline-block bg-[#02667F] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#024d5f] transition-colors"
                >
                  Try LevyLite free (5 lots or less)
                </Link>
                <p className="text-sm text-[#3A3A3A]/60 mt-3">No credit card required • From $0.75/lot/month after free tier</p>
              </div>
            </section>

            {/* Final Thoughts */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[#3A3A3A] mb-6">
                Final Thoughts
              </h2>
              <p className="text-lg text-[#3A3A3A]/80 mb-4">
                Strata management isn't inherently overpriced—managers provide genuine value for complex schemes. But for small, simple schemes under 20 lots, the cost-benefit equation often doesn't add up.
              </p>
              <p className="text-lg text-[#3A3A3A]/80">
                If you're paying $300–$700 per lot per year for basic levy collection and annual meetings, modern software can deliver the same outcome for 1–2% of the cost. The catch? You need at least one owner willing to be the "software operator". But for many small schemes, that's a trade-off worth making.
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
          </div>
        </div>
      </section>
    </div>
  );
}
