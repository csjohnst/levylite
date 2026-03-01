import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strata Management Costs in WA: What You're Really Paying For | LevyLite",
  description: "A transparent comparison of professional strata management fees versus self-managed and software-assisted alternatives in Western Australia. Real costs, real savings.",
  openGraph: {
    title: "Strata Management Costs in WA: What You're Really Paying For",
    description: "A transparent comparison of professional strata management fees versus self-managed and software-assisted alternatives in Western Australia.",
    type: "article",
    publishedTime: "2026-03-01",
  },
};

export default function StrataCostsWA() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/blog" className="text-[#02667F] hover:underline text-sm">
            ← Back to Blog
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#3A3A3A] mb-4">
            Strata Management Costs in WA: What You're Really Paying For
          </h1>
          <p className="text-xl text-[#3A3A3A]/80">
            A transparent comparison of professional strata management fees versus self-managed and software-assisted alternatives in Western Australia.
          </p>
          <div className="flex items-center gap-4 mt-6 text-sm text-[#3A3A3A]/60">
            <time dateTime="2026-03-01">1 March 2026</time>
            <span>•</span>
            <span>8 min read</span>
          </div>
        </header>

        <div className="prose prose-lg max-w-none prose-headings:text-[#3A3A3A] prose-a:text-[#02667F]">
          <p className="lead">
            Strata management fees in Western Australia typically range from $2,000 to $8,000+ per year—depending on your scheme's size and complexity. For a 10-lot scheme, that's often 30-50% of your entire administrative budget.
          </p>

          <p>
            But what are you actually paying for? And are there cheaper alternatives that don't sacrifice quality?
          </p>

          <p>
            This post breaks down the real costs of professional management, self-management, and software-assisted management—with transparent numbers.
          </p>

          <h2>What Does Professional Strata Management Cost in WA?</h2>
          <p>
            Strata management fees in WA are typically structured in one of two ways:
          </p>

          <h3>1. Per-Lot Fee (Most Common)</h3>
          <p>
            Charged per lot per month or per year. This is the most common model for residential schemes.
          </p>

          <Card className="my-6">
            <div className="p-6">
              <h4 className="text-lg font-bold text-[#3A3A3A] mb-4">Typical Per-Lot Fees in WA</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <p className="font-bold text-[#3A3A3A]">Small schemes (5-10 lots)</p>
                    <p className="text-sm text-[#3A3A3A]/60">Townhouses, duplexes, small apartment blocks</p>
                  </div>
                  <p className="font-bold text-xl text-[#02667F]">$25-$40/lot/month</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <p className="font-bold text-[#3A3A3A]">Medium schemes (11-30 lots)</p>
                    <p className="text-sm text-[#3A3A3A]/60">Apartment buildings, unit complexes</p>
                  </div>
                  <p className="font-bold text-xl text-[#02667F]">$20-$30/lot/month</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#3A3A3A]">Large schemes (31+ lots)</p>
                    <p className="text-sm text-[#3A3A3A]/60">Large complexes, mixed-use developments</p>
                  </div>
                  <p className="font-bold text-xl text-[#02667F]">$15-$25/lot/month</p>
                </div>
              </div>
            </div>
          </Card>

          <p>
            <strong>Example:</strong> A 10-lot townhouse scheme paying $30/lot/month = <strong>$3,600/year</strong>.
          </p>

          <h3>2. Flat Annual Fee</h3>
          <p>
            Some managers charge a flat fee regardless of lot count. This is more common for very small schemes or those with minimal common property.
          </p>
          <p>
            <strong>Typical range:</strong> $2,000–$5,000/year for schemes under 10 lots.
          </p>

          <h3>What's Included in the Fee?</h3>
          <p>
            Most management contracts include:
          </p>
          <ul>
            <li>Levy calculation and collection</li>
            <li>Payment tracking and arrears management</li>
            <li>AGM organisation and attendance</li>
            <li>Council meeting attendance (if required)</li>
            <li>Financial reporting and owner statements</li>
            <li>Insurance renewal coordination</li>
            <li>Record-keeping and document storage</li>
          </ul>

          <h3>What's NOT Included (and Costs Extra)</h3>
          <ul>
            <li><strong>Debt recovery:</strong> If a manager engages lawyers to chase unpaid levies, you'll be charged separately (often $500–$2,000+).</li>
            <li><strong>Tribunal representation:</strong> If you need the manager to attend SAT hearings, expect hourly rates ($150–$300/hour).</li>
            <li><strong>Special project management:</strong> Major renovation coordination, insurance claims, or complex disputes may incur extra fees.</li>
          </ul>

          <Card className="my-6 p-6 bg-yellow-50 border-l-4 border-yellow-600">
            <h4 className="text-lg font-bold text-[#3A3A3A] mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              Hidden Costs to Watch For
            </h4>
            <p className="text-[#3A3A3A]/80 mb-0">
              Some managers charge "admin fees" for routine tasks like printing levy notices, sending emails, or preparing AGM papers. These can add hundreds of dollars per year. <strong>Always ask for a detailed fee schedule before signing.</strong>
            </p>
          </Card>

          <h2>Is Professional Management Worth It?</h2>
          <p>
            For some schemes, yes. For others, no. It depends on three factors:
          </p>

          <h3>1. Scheme Size</h3>
          <ul>
            <li><strong>Under 10 lots:</strong> Professional management is often poor value. You're paying for services you don't need at scale.</li>
            <li><strong>10-30 lots:</strong> It depends. If the Council is functional and someone has time, self-management (with software) is viable.</li>
            <li><strong>30+ lots:</strong> Professional management usually makes sense due to workload and complexity.</li>
          </ul>

          <h3>2. Complexity</h3>
          <ul>
            <li><strong>Simple schemes</strong> (driveways, gardens, basic fencing) can self-manage easily.</li>
            <li><strong>Complex schemes</strong> (pools, lifts, commercial tenancies, body corporate hierarchies) benefit from professional expertise.</li>
          </ul>

          <h3>3. Owner Engagement</h3>
          <ul>
            <li>If 1-2 owners are willing to coordinate maintenance and handle admin, self-management works.</li>
            <li>If no one has time or interest, hiring a manager is the only realistic option.</li>
          </ul>

          <h2>What Does Self-Management Cost?</h2>
          <p>
            Self-management doesn't mean <em>free</em>. There are still costs—they're just different.
          </p>

          <h3>Direct Costs</h3>
          <ul>
            <li><strong>Bank fees:</strong> Separate bank account for the strata company (~$10–$20/month = $120–$240/year).</li>
            <li><strong>Insurance broker fees (optional):</strong> If you use a broker to source building insurance, they may charge $100–$300/year.</li>
            <li><strong>Legal advice (occasional):</strong> If you need help interpreting the Strata Titles Act or drafting by-laws, expect $200–$500 per consultation.</li>
            <li><strong>Accounting (optional):</strong> Some schemes hire a bookkeeper to prepare end-of-year financial statements (~$300–$600/year).</li>
          </ul>

          <h3>Time Costs</h3>
          <p>
            The biggest "cost" of self-management is <strong>time</strong>. For a 10-lot scheme, expect:
          </p>
          <ul>
            <li><strong>Monthly admin:</strong> 2-4 hours (levy tracking, bill payments, owner emails)</li>
            <li><strong>Quarterly levy notices:</strong> 2 hours (if done manually)</li>
            <li><strong>Annual AGM prep:</strong> 4-6 hours (agenda, budgets, financial reports)</li>
            <li><strong>AGM attendance:</strong> 2-3 hours</li>
            <li><strong>Insurance renewal:</strong> 2-4 hours</li>
            <li><strong>Maintenance coordination:</strong> 5-15 hours/year (varies wildly depending on issues)</li>
          </ul>
          <p>
            <strong>Total:</strong> ~60-100 hours/year.
          </p>

          <p>
            If you value your time at $50/hour, that's $3,000–$5,000 worth of labor—which is roughly what you'd pay a professional manager anyway.
          </p>

          <p>
            <strong>The catch:</strong> That time estimate assumes you're doing everything manually (spreadsheets, emails, reminders). Software can cut it by 50-70%.
          </p>

          <h2>What Does Software-Assisted Self-Management Cost?</h2>
          <p>
            This is the middle ground: you stay in control, but software handles the repetitive tasks.
          </p>

          <h3>Software Costs</h3>
          <ul>
            <li><strong>Enterprise strata software:</strong> $3,000–$10,000+/year (Intellistrata, Strata Master, etc.). These are designed for professional managers, not owner-managers. Minimum lot counts often apply.</li>
            <li><strong>Small-operator tools:</strong> $150–$500/year (LevyLite, etc.). Purpose-built for small, self-managed schemes.</li>
          </ul>

          <h3>Time Costs (With Software)</h3>
          <p>
            With automation, your 60-100 hours/year drops to:
          </p>
          <ul>
            <li><strong>Monthly admin:</strong> 30 minutes (software auto-sends levy reminders and tracks payments)</li>
            <li><strong>Quarterly levy notices:</strong> 10 minutes (auto-generated and emailed)</li>
            <li><strong>Annual AGM prep:</strong> 2-3 hours (software generates financial reports and AGM templates)</li>
            <li><strong>AGM attendance:</strong> 2-3 hours (unchanged)</li>
            <li><strong>Insurance renewal:</strong> 2-4 hours (unchanged)</li>
            <li><strong>Maintenance coordination:</strong> 5-15 hours/year (unchanged—this still needs a human)</li>
          </ul>
          <p>
            <strong>Total:</strong> ~20-40 hours/year.
          </p>

          <p>
            At $50/hour, that's $1,000–$2,000 worth of labor + $150–$500 in software costs = <strong>$1,150–$2,500/year total</strong>.
          </p>

          <h2>Cost Comparison: Real Numbers for a 10-Lot Scheme</h2>

          <Card className="my-8">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-[#3A3A3A] mb-6">Annual Cost Breakdown</h3>
              
              <div className="space-y-6">
                <div className="pb-6 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-[#3A3A3A]">Professional Manager</h4>
                    <div className="flex items-center gap-2 text-red-600">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-2xl font-bold">$3,600/year</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-[#3A3A3A]/80 text-sm">
                    <li>• Management fee: $30/lot/month × 10 lots = $3,600</li>
                    <li>• No owner time required (beyond AGM attendance)</li>
                    <li>• Additional fees for debt recovery, tribunal work, special projects</li>
                  </ul>
                </div>

                <div className="pb-6 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-[#3A3A3A]">Full Self-Management (Manual)</h4>
                    <div className="flex items-center gap-2 text-yellow-600">
                      <TrendingDown className="w-5 h-5" />
                      <span className="text-2xl font-bold">$2,700–$4,800/year</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-[#3A3A3A]/80 text-sm">
                    <li>• Bank fees: $240/year</li>
                    <li>• Optional bookkeeper: $400/year</li>
                    <li>• Owner time: 60-100 hours @ $50/hour = $3,000-$5,000</li>
                    <li>• Spreadsheets, manual emails, no automation</li>
                  </ul>
                </div>

                <div className="bg-green-50 -m-6 p-6 rounded-b-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-[#3A3A3A]">Software-Assisted Self-Management</h4>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingDown className="w-5 h-5" />
                      <span className="text-2xl font-bold">$1,400–$2,700/year</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-[#3A3A3A]/80 text-sm">
                    <li>• Software subscription: $200/year</li>
                    <li>• Bank fees: $240/year</li>
                    <li>• Optional bookkeeper: $400/year</li>
                    <li>• Owner time: 20-40 hours @ $50/hour = $1,000-$2,000</li>
                    <li>• Automated levy notices, reminders, financial reports</li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-green-700 font-bold">
                      Savings vs. professional manager: <span className="text-2xl">$900–$2,200/year</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <h2>When Does Each Option Make Sense?</h2>

          <h3>Choose Professional Management When:</h3>
          <ul>
            <li>Your scheme has 30+ lots or complex facilities (pools, lifts, commercial tenancies)</li>
            <li>No owner has time to coordinate maintenance and contractors</li>
            <li>There are ongoing disputes or by-law enforcement issues</li>
            <li>You need neutral mediation between owners</li>
            <li>You value peace of mind over cost savings</li>
          </ul>

          <h3>Choose Software-Assisted Self-Management When:</h3>
          <ul>
            <li>Your scheme has fewer than 20 lots</li>
            <li>Common property is simple (gardens, driveways, basic fencing)</li>
            <li>1-2 owners are willing to coordinate maintenance</li>
            <li>The Council works well together</li>
            <li>You want control and cost savings without the spreadsheet headaches</li>
          </ul>

          <h3>Choose Full Self-Management (Manual) When:</h3>
          <ul>
            <li>Your scheme is very small (under 5 lots)</li>
            <li>There's almost no common property</li>
            <li>You enjoy spreadsheets and have plenty of time</li>
            <li>You're comfortable with manual processes</li>
          </ul>

          <h2>What About the Quality of Service?</h2>
          <p>
            A common concern: "Won't self-management (even with software) be worse than hiring a professional?"
          </p>

          <p>
            <strong>The reality:</strong> It depends on the professional. Some strata managers are excellent—responsive, proactive, and worth every dollar. Others are slow to respond, make errors, and provide minimal value for their fees.
          </p>

          <p>
            Self-management (with good software) can match or exceed the quality of a mediocre professional manager—because <em>you actually care</em> about your scheme. You're not managing 50 properties across Perth; you're managing one, and it's your home.
          </p>

          <Card className="my-8 p-6 bg-gradient-to-r from-[#02667F] to-[#0090B7] text-white">
            <h3 className="text-2xl font-bold mb-4">Self-manage without the spreadsheet pain</h3>
            <p className="text-white/90 mb-6">
              LevyLite gives you 90% of the cost savings of full self-management, with 80% less manual work. From $0.75/lot/month. No minimums. No sales calls.
            </p>
            <SignupForm buttonText="Get early access" dark={true} />
          </Card>

          <h2>Final Thoughts</h2>
          <p>
            Strata management fees in WA range from $2,000 to $8,000+/year. For small schemes, that's often excessive—you're paying for services you don't need at scale, delivered by someone managing dozens of other properties.
          </p>

          <p>
            <strong>Professional management makes sense</strong> for large or complex schemes, or when no owner has time to stay involved.
          </p>

          <p>
            <strong>Software-assisted self-management makes sense</strong> for small, simple schemes where owners want control and cost savings without the manual admin burden.
          </p>

          <p>
            <strong>Full manual self-management</strong> is only worth it if you genuinely enjoy the work—or your scheme is so small that the time commitment is negligible.
          </p>

          <p>
            The right choice depends on your scheme's size, complexity, and the willingness of owners to stay involved. But if you're a 10-lot townhouse scheme paying $3,600/year for automated emails and one AGM appearance, there's a better way.
          </p>
        </div>

        <footer className="mt-16 pt-8 border-t">
          <Link href="/blog" className="text-[#02667F] hover:underline">
            ← Back to all posts
          </Link>
        </footer>
      </article>
    </div>
  );
}
