import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { Check, X, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?) | LevyLite",
  description: "A detailed breakdown of strata manager responsibilities and an honest look at what software can and can't automate in strata management.",
  openGraph: {
    title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?)",
    description: "A detailed breakdown of strata manager responsibilities and an honest look at what software can and can't automate.",
    type: "article",
    publishedTime: "2026-03-01",
  },
};

export default function StrataManagerDuties() {
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
            What Does a Strata Manager Actually Do? (And Can Software Replace Them?)
          </h1>
          <p className="text-xl text-[#3A3A3A]/80">
            A detailed breakdown of strata manager responsibilities—and an honest look at what software can and can't automate.
          </p>
          <div className="flex items-center gap-4 mt-6 text-sm text-[#3A3A3A]/60">
            <time dateTime="2026-03-01">1 March 2026</time>
            <span>•</span>
            <span>10 min read</span>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <p className="lead">
            Strata managers charge $2,000–$8,000+ per year. For small schemes, that's often 40% of the total administrative budget. But what do they actually <em>do</em> all day? And how much of it can software realistically handle?
          </p>

          <p>
            This post breaks down the role, task by task—and gives you an honest answer about what can (and can't) be automated.
          </p>

          <h2>The Core Responsibilities</h2>
          <p>
            A professional strata manager handles three main categories of work:
          </p>
          <ol>
            <li><strong>Financial administration:</strong> Levy collection, budgeting, payments, and record-keeping.</li>
            <li><strong>Compliance and governance:</strong> AGMs, meetings, minutes, insurance, and legal obligations.</li>
            <li><strong>Property and maintenance:</strong> Organising repairs, sourcing contractors, and managing disputes.</li>
          </ol>
          <p>
            Let's break each one down.
          </p>

          <h2>1. Financial Administration</h2>

          <h3>What They Do</h3>
          <ul>
            <li><strong>Calculate and raise levies:</strong> Work out each owner's share based on unit entitlements and the approved budget.</li>
            <li><strong>Send levy notices:</strong> Email or mail levy statements to owners with payment details and due dates.</li>
            <li><strong>Track payments:</strong> Reconcile bank accounts, record who's paid, and identify arrears.</li>
            <li><strong>Chase overdue levies:</strong> Send reminders, formal notices, and (if needed) refer to debt collectors or lawyers.</li>
            <li><strong>Pay bills:</strong> Common area expenses (insurance, cleaning, utilities, maintenance).</li>
            <li><strong>Maintain financial records:</strong> Keep accurate accounts of the administrative fund and reserve fund.</li>
            <li><strong>Prepare financial reports:</strong> Balance sheets, income statements, and levy summaries for AGMs.</li>
          </ul>

          <h3>Can Software Do This?</h3>
          <Card className="my-6 p-6 bg-green-50 border-l-4 border-green-600">
            <h4 className="text-lg font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Yes, mostly.
            </h4>
            <p className="text-[#3A3A3A]/80 mb-4">
              This is the <strong>most automatable</strong> part of strata management. Software can:
            </p>
            <ul className="space-y-2 mb-0 text-[#3A3A3A]/80">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Auto-calculate levy amounts per owner based on unit entitlements</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Generate and email levy notices automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Track payments and arrears in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Send automated reminders for overdue levies</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Generate owner statements and financial reports</span>
              </li>
            </ul>
          </Card>
          <p>
            <strong>What software can't do:</strong> Make judgment calls about payment plans, negotiate with owners in financial hardship, or decide when to escalate to legal action. That still needs a human.
          </p>

          <h2>2. Compliance and Governance</h2>

          <h3>What They Do</h3>
          <ul>
            <li><strong>Organise AGMs:</strong> Schedule the meeting, prepare the agenda, distribute notice to owners (14+ days in advance), prepare budgets and financial reports.</li>
            <li><strong>Take meeting minutes:</strong> Attend AGMs and Council meetings, record decisions, and distribute minutes to owners.</li>
            <li><strong>Manage insurance:</strong> Arrange building insurance for full replacement value, renew annually, handle claims if needed.</li>
            <li><strong>Maintain records:</strong> Keep copies of strata plans, by-laws, meeting minutes, financial records, and owner correspondence.</li>
            <li><strong>Respond to owner enquiries:</strong> Answer questions about levies, by-laws, maintenance, and scheme matters.</li>
          </ul>

          <h3>Can Software Do This?</h3>
          <Card className="my-6 p-6 bg-yellow-50 border-l-4 border-yellow-600">
            <h4 className="text-lg font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Partially.
            </h4>
            <p className="text-[#3A3A3A]/80 mb-4">
              Software can handle the <strong>administrative</strong> parts:
            </p>
            <ul className="space-y-2 mb-4 text-[#3A3A3A]/80">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Generate AGM notice templates with meeting details and proposed budgets</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Email AGM papers to all owners</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Store meeting minutes, by-laws, and documents in a central repository</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Track insurance renewal dates and send reminders</span>
              </li>
            </ul>
            <p className="text-[#3A3A3A]/80 mb-0">
              <strong>What software can't do:</strong> Actually <em>attend</em> the meeting, take minutes, interpret the Strata Titles Act, or provide legal advice. You'll need a person for that (either an owner or a paid minute-taker/advisor).
            </p>
          </Card>

          <h2>3. Property and Maintenance</h2>

          <h3>What They Do</h3>
          <ul>
            <li><strong>Organise repairs and maintenance:</strong> Source quotes from contractors, get Council approval, coordinate work, and pay invoices.</li>
            <li><strong>Handle emergencies:</strong> Arrange urgent repairs (burst pipes, storm damage, security issues).</li>
            <li><strong>Manage contractors:</strong> Engage gardeners, cleaners, pool maintenance, lift servicing, fire safety inspections, etc.</li>
            <li><strong>Property inspections:</strong> Conduct regular inspections to identify maintenance issues before they become expensive.</li>
            <li><strong>Enforce by-laws:</strong> Investigate complaints (noise, parking, pets), issue breach notices, and escalate to the State Administrative Tribunal if needed.</li>
            <li><strong>Mediate disputes:</strong> Act as a neutral party between owners when conflicts arise.</li>
          </ul>

          <h3>Can Software Do This?</h3>
          <Card className="my-6 p-6 bg-red-50 border-l-4 border-red-600">
            <h4 className="text-lg font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              No. Not really.
            </h4>
            <p className="text-[#3A3A3A]/80 mb-4">
              This is where professional managers earn their fees. Software can help with <strong>task tracking</strong> (maintenance requests, contractor contact lists, repair logs), but it can't:
            </p>
            <ul className="space-y-2 mb-0 text-[#3A3A3A]/80">
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Source and compare quotes from contractors</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Inspect properties and identify issues</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Coordinate emergency repairs at 2am</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Mediate disputes between owners</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Enforce by-laws and issue breach notices</span>
              </li>
            </ul>
          </Card>
          <p>
            <strong>Exception:</strong> If your scheme is <em>very</em> simple (no shared facilities, minimal common property, no ongoing disputes), this category might be low-effort enough for owners to handle themselves.
          </p>

          <h2>What's the Real Value of a Strata Manager?</h2>
          <p>
            Now that we've broken down the tasks, let's be clear about what you're actually paying for:
          </p>

          <h3>1. Time (Worth It for Large or Complex Schemes)</h3>
          <p>
            For a 20-lot scheme, a strata manager might spend 60-100 hours per year on administration. If no owner has that time, hiring a manager makes sense.
          </p>

          <h3>2. Expertise (Worth It for Legal or Dispute-Heavy Schemes)</h3>
          <p>
            If your scheme frequently deals with by-law breaches, tribunal matters, or insurance claims, a professional manager's knowledge of the <em>Strata Titles Act 1985 (WA)</em> is invaluable.
          </p>

          <h3>3. Neutrality (Worth It for Dysfunctional Councils)</h3>
          <p>
            If the Council can't agree on anything or there are ongoing personality conflicts, a neutral third-party manager can defuse tensions.
          </p>

          <h3>4. Contractor Networks (Mixed Value)</h3>
          <p>
            Experienced managers have relationships with reliable contractors. But you can build your own network over time—or ask other owners for recommendations.
          </p>

          <h3>5. Routine Admin (NOT Worth Paying For)</h3>
          <p>
            Levy calculations, payment tracking, and AGM notices are <strong>repetitive, rule-based tasks</strong>. This is exactly what software is good at. Paying $5,000/year for someone to manually email levy notices is wasteful.
          </p>

          <h2>The Honest Answer: Can Software Replace a Strata Manager?</h2>

          <Card className="my-8 p-6">
            <h3 className="text-2xl font-bold text-[#3A3A3A] mb-6">It Depends on Your Scheme</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-green-600 mb-2 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Software CAN replace a manager when:
                </h4>
                <ul className="space-y-1 text-[#3A3A3A]/80 ml-7">
                  <li>Your scheme is small (under 20 lots)</li>
                  <li>Common property is minimal and low-maintenance</li>
                  <li>The Council works well together</li>
                  <li>1-2 owners are willing to handle property/contractor coordination</li>
                  <li>There are no ongoing disputes or tribunal matters</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  Software CANNOT replace a manager when:
                </h4>
                <ul className="space-y-1 text-[#3A3A3A]/80 ml-7">
                  <li>Your scheme is large (30+ lots) or complex (commercial, lifts, pools)</li>
                  <li>Frequent disputes or by-law enforcement issues</li>
                  <li>Regular tribunal or legal matters</li>
                  <li>No owner has time to coordinate maintenance and contractors</li>
                  <li>The Council is dysfunctional and needs a neutral mediator</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-lg font-bold text-[#02667F] mb-2">The Sweet Spot:</h4>
                <p className="text-[#3A3A3A]/80 mb-0">
                  <strong>Software for admin, owners (or a part-time advisor) for everything else.</strong> This hybrid model gives you 80% of the cost savings of full self-management, with 20% of the effort.
                </p>
              </div>
            </div>
          </Card>

          <h2>Real-World Example: A 12-Lot Townhouse Scheme</h2>
          <p>
            Let's say you have 12 townhouses with shared driveways, gardens, and a boundary fence.
          </p>

          <h3>What a Strata Manager Would Do (and Charge)</h3>
          <ul>
            <li>Calculate and send quarterly levy notices (automated, but you're still paying for it)</li>
            <li>Track payments and send reminders (automated, but you're still paying for it)</li>
            <li>Arrange AGM papers and attend the meeting (1 hour prep + 2 hours attendance)</li>
            <li>Organise fence repairs (source quotes, get approval, coordinate work) (3-4 hours)</li>
            <li>Renew building insurance (2 hours)</li>
            <li>Answer owner emails (5-10 hours/year)</li>
          </ul>
          <p>
            <strong>Total effort:</strong> ~20-30 hours/year<br />
            <strong>Typical fee:</strong> $3,000–$5,000/year
          </p>

          <h3>What Software + Owners Could Do</h3>
          <ul>
            <li><strong>Software handles:</strong> Levy notices, payment tracking, automated reminders, AGM templates, owner statements (no human effort)</li>
            <li><strong>Owners handle:</strong> Organising AGM (1 hour), attending AGM (2 hours), fence repairs (3-4 hours), insurance renewal (2 hours), answering emails (5-10 hours)</li>
          </ul>
          <p>
            <strong>Total owner effort:</strong> ~13-19 hours/year<br />
            <strong>Software cost:</strong> $150–$200/year
          </p>
          <p>
            <strong>Savings:</strong> $2,800–$4,850/year
          </p>

          <Card className="my-8 p-6 bg-gradient-to-r from-[#02667F] to-[#0090B7] text-white">
            <h3 className="text-2xl font-bold mb-4">Cut the admin burden, not the control</h3>
            <p className="text-white/90 mb-6">
              LevyLite automates the repetitive tasks—levy notices, payment tracking, reminders—so you can focus on what actually matters: maintaining the property and keeping owners happy.
            </p>
            <SignupForm buttonText="Get early access" dark={true} />
          </Card>

          <h2>Final Thoughts</h2>
          <p>
            Strata managers provide real value—but not all of it is essential, and not all of it justifies the cost for small schemes.
          </p>
          <p>
            <strong>Financial administration?</strong> Almost entirely automatable. Pay for software, not manual labor.
          </p>
          <p>
            <strong>Compliance and governance?</strong> Software can help, but you'll still need a person (owner or advisor) for meetings and legal matters.
          </p>
          <p>
            <strong>Property and maintenance?</strong> This is where managers earn their fees. If your scheme is simple and low-maintenance, owners can handle it. If it's complex, you probably need a pro.
          </p>
          <p>
            The right choice depends on your scheme's size, complexity, and the willingness of owners to stay involved. But if you're a small scheme paying $5,000/year for a manager to send automated emails and attend one AGM, there's a better way.
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
