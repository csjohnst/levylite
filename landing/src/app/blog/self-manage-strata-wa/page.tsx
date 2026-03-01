import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { Check, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide | LevyLite",
  description: "Complete guide to self-managing a strata scheme in Western Australia. Learn legal requirements, day-to-day tasks, and whether self-management is right for your scheme.",
  openGraph: {
    title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide",
    description: "Everything you need to know about self-managing a strata scheme in Western Australia, from legal requirements to day-to-day operations.",
    type: "article",
    publishedTime: "2026-03-01",
  },
};

export default function SelfManageStrataWA() {
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
            How to Self-Manage Your Strata in WA — A Step-by-Step Guide
          </h1>
          <p className="text-xl text-[#3A3A3A]/80">
            Everything you need to know about self-managing a strata scheme in Western Australia, from legal requirements to day-to-day operations.
          </p>
          <div className="flex items-center gap-4 mt-6 text-sm text-[#3A3A3A]/60">
            <time dateTime="2026-03-01">1 March 2026</time>
            <span>•</span>
            <span>12 min read</span>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <p className="lead">
            Self-managing a strata scheme in Western Australia is entirely legal—and increasingly common. For small schemes (under 20 lots), it can save thousands of dollars per year. But it's not for everyone, and it comes with real responsibilities.
          </p>

          <p>
            This guide walks you through everything you need to know: legal requirements, day-to-day tasks, and whether self-management makes sense for your scheme.
          </p>

          <h2>Is Self-Management Legal in WA?</h2>
          <p>
            <strong>Yes.</strong> Under the <em>Strata Titles Act 1985 (WA)</em>, there is no legal requirement to hire a professional strata manager. The strata company (all owners collectively) can choose to manage the scheme themselves.
          </p>

          <Card className="my-6 p-6 bg-blue-50 border-l-4 border-[#02667F]">
            <h3 className="text-lg font-bold text-[#3A3A3A] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#02667F]" />
              Important: The Council of Owners is the decision-maker
            </h3>
            <p className="text-[#3A3A3A]/80 mb-0">
              Self-management doesn't mean individual owners can act unilaterally. The <strong>Council of Owners</strong> (or the strata company at a general meeting) must make decisions collectively. One owner cannot simply "take over" management without proper authorisation.
            </p>
          </Card>

          <h2>What Are the Legal Requirements?</h2>
          <p>
            Even self-managed schemes must comply with the <em>Strata Titles Act 1985 (WA)</em>. Key obligations include:
          </p>

          <ul>
            <li><strong>Annual General Meetings (AGMs):</strong> Must be held within 15 months of the previous AGM (Section 129). Notice must be given at least 14 days in advance.</li>
            <li><strong>Financial records:</strong> Maintain accurate accounts of levies, expenses, and the administrative fund and reserve fund balances.</li>
            <li><strong>Levy collection:</strong> Raise levies as determined at the AGM and pursue unpaid levies through legal channels if necessary.</li>
            <li><strong>Insurance:</strong> Maintain building insurance for the full replacement value of common property (Section 151).</li>
            <li><strong>Notices and correspondence:</strong> Keep owners informed of decisions, upcoming meetings, and scheme matters.</li>
          </ul>

          <h2>Step-by-Step: How to Self-Manage</h2>

          <h3>1. Get Authorisation from the Strata Company</h3>
          <p>
            The Council of Owners (or the strata company at a general meeting) must resolve to self-manage. This should be recorded in the meeting minutes. If you're transitioning from a professional manager, you'll need to give proper notice per your management contract.
          </p>

          <h3>2. Understand Your Legal Obligations</h3>
          <p>
            Read the <em>Strata Titles Act 1985 (WA)</em> — particularly Sections 129 (AGMs), 141 (levies), 147 (administrative fund), 148 (reserve fund), and 151 (insurance). You don't need a law degree, but you do need to know the basics.
          </p>
          <p>
            Also review your scheme's <strong>by-laws</strong>. These are specific rules for your property (e.g., pet restrictions, noise limits). You'll need to enforce them fairly.
          </p>

          <h3>3. Set Up a Financial System</h3>
          <p>
            You need a way to track:
          </p>
          <ul>
            <li>Levy payments (who's paid, who owes, payment schedules)</li>
            <li>Expenses (common area maintenance, insurance, utilities)</li>
            <li>Fund balances (administrative fund and reserve fund)</li>
          </ul>
          <p>
            Options:
          </p>
          <ul>
            <li><strong>Spreadsheets:</strong> Free, but manual and error-prone.</li>
            <li><strong>Accounting software:</strong> Xero or MYOB can work, but they're not designed for strata.</li>
            <li><strong>Strata software:</strong> Tools like LevyLite automate levy schedules, reminders, and owner statements.</li>
          </ul>

          <h3>4. Calculate and Raise Levies</h3>
          <p>
            At the AGM, the strata company must approve:
          </p>
          <ul>
            <li><strong>Administrative fund budget:</strong> Day-to-day operating costs (insurance, utilities, cleaning, minor repairs).</li>
            <li><strong>Reserve fund budget:</strong> Long-term maintenance and major repairs (roof replacement, repainting).</li>
          </ul>
          <p>
            Levies are split between owners based on <strong>unit entitlements</strong> (defined in the strata plan). Once approved, levies must be raised and collected per the agreed schedule (quarterly, bi-annually, or annually).
          </p>

          <h3>5. Collect Levies and Chase Arrears</h3>
          <p>
            Send levy notices to owners with payment details and due dates. If someone doesn't pay:
          </p>
          <ol>
            <li>Send a polite reminder.</li>
            <li>If still unpaid, send a formal notice (cite Section 141 of the Act).</li>
            <li>As a last resort, engage a debt collector or lawyer. Unpaid levies can be recovered as a debt in court.</li>
          </ol>

          <Card className="my-6 p-6 bg-green-50 border-l-4 border-green-600">
            <h3 className="text-lg font-bold text-[#3A3A3A] mb-2 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Pro tip: Automate levy reminders
            </h3>
            <p className="text-[#3A3A3A]/80 mb-0">
              Chasing late payments is the most time-consuming part of self-management. Automated email reminders (sent 7 days before due, on due date, and 7/14 days overdue) cut manual work by 80%.
            </p>
          </Card>

          <h3>6. Arrange Insurance</h3>
          <p>
            Building insurance is <strong>mandatory</strong> (Section 151). You must insure common property for the full replacement value. Get quotes from insurers who specialise in strata schemes (e.g., CHU, Chubb, Strata Community Insurance).
          </p>
          <p>
            Review insurance annually. If your scheme hasn't had a building valuation in over 2 years, get one—underinsurance can leave owners personally liable in a disaster.
          </p>

          <h3>7. Organise AGMs</h3>
          <p>
            You must hold an AGM at least once every 15 months. Steps:
          </p>
          <ol>
            <li><strong>14+ days before:</strong> Send notice to all owners with the agenda, proposed budgets, and minutes from the last meeting.</li>
            <li><strong>On the day:</strong> Hold the meeting (in person or online). Quorum is 50% of lots (by unit entitlement).</li>
            <li><strong>After:</strong> Distribute minutes to all owners within 30 days.</li>
          </ol>

          <h3>8. Maintain Common Property</h3>
          <p>
            The strata company is responsible for maintaining common property (gardens, driveways, roofs, external walls, plumbing). This includes:
          </p>
          <ul>
            <li>Regular maintenance (lawn mowing, gutter cleaning)</li>
            <li>Repairs (broken gates, damaged fencing)</li>
            <li>Emergency work (burst pipes, storm damage)</li>
          </ul>
          <p>
            You'll need to source quotes, approve work (via the Council or a meeting), and pay invoices from the administrative or reserve fund.
          </p>

          <h3>9. Enforce By-Laws</h3>
          <p>
            If an owner breaches by-laws (e.g., unapproved renovations, noise complaints), the Council must investigate and, if necessary, issue a notice to comply. Persistent breaches can be referred to the State Administrative Tribunal (SAT).
          </p>

          <h2>What Do You Actually Need to Do Day-to-Day?</h2>
          <p>
            Here's a realistic breakdown of the workload for a small (10-lot) self-managed scheme:
          </p>

          <Card className="my-6">
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#3A3A3A] mb-4">Monthly Tasks</h3>
              <ul className="space-y-2 mb-0">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Check levy payments (2 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Send reminders for overdue levies (30 minutes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Pay common area bills (insurance, water, cleaning) (1 hour)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Update financial records (1 hour)</span>
                </li>
              </ul>
            </div>
            <div className="p-6 border-t">
              <h3 className="text-xl font-bold text-[#3A3A3A] mb-4">Quarterly Tasks</h3>
              <ul className="space-y-2 mb-0">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Send levy notices (if quarterly payment schedule) (2 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Council meeting (if required) (1-2 hours)</span>
                </li>
              </ul>
            </div>
            <div className="p-6 border-t">
              <h3 className="text-xl font-bold text-[#3A3A3A] mb-4">Annual Tasks</h3>
              <ul className="space-y-2 mb-0">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Prepare AGM papers (budget, agenda, minutes) (4-6 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Hold AGM (2-3 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Renew insurance (3-4 hours)</span>
                </li>
              </ul>
            </div>
            <div className="p-6 border-t bg-[#F6F8FA]">
              <p className="text-lg font-bold text-[#3A3A3A] mb-1">Total time commitment:</p>
              <p className="text-[#3A3A3A]/80 mb-0"><strong>~60-80 hours per year</strong> for a 10-lot scheme with no major dramas.</p>
            </div>
          </Card>

          <h2>When Self-Management Makes Sense</h2>
          <p>
            Self-management is a good fit when:
          </p>
          <ul>
            <li><strong>You have a small scheme:</strong> Under 10-15 lots is ideal. Beyond that, the admin burden gets heavy.</li>
            <li><strong>Owners are engaged:</strong> At least 1-2 owners are willing to handle the day-to-day tasks.</li>
            <li><strong>The scheme is simple:</strong> Minimal common property, no lifts, no pools, no complex maintenance.</li>
            <li><strong>The Council works well together:</strong> No ongoing disputes or difficult personalities.</li>
            <li><strong>You want control:</strong> Some owners prefer hands-on involvement over outsourcing.</li>
          </ul>

          <h2>When to Hire a Professional Manager</h2>
          <p>
            Self-management is <strong>not</strong> a good idea when:
          </p>
          <ul>
            <li><strong>The scheme is large or complex:</strong> 20+ lots, commercial tenancies, shared facilities (gyms, pools, elevators).</li>
            <li><strong>No one has time:</strong> If all owners work full-time and have families, self-management becomes a burden.</li>
            <li><strong>There are ongoing disputes:</strong> A neutral professional manager can defuse tensions.</li>
            <li><strong>Legal issues are frequent:</strong> If you're regularly dealing with tribunal matters or debt recovery, you need expert help.</li>
          </ul>

          <h2>The Middle Ground: Software-Assisted Self-Management</h2>
          <p>
            You don't have to choose between full self-management (with spreadsheets and manual emails) and hiring a $5,000/year professional manager.
          </p>
          <p>
            <strong>Strata management software</strong> automates the repetitive, time-consuming tasks—levy schedules, payment reminders, owner statements, AGM notices—while leaving you in control.
          </p>
          <p>
            For schemes under 20 lots, software like <Link href="/" className="text-[#02667F] hover:underline">LevyLite</Link> typically costs under $200/year. That's 95% less than a professional manager, with 80% less manual work than pure self-management.
          </p>

          <Card className="my-8 p-6 bg-gradient-to-r from-[#02667F] to-[#0090B7] text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to self-manage smarter?</h3>
            <p className="text-white/90 mb-6">
              LevyLite automates levy reminders, owner statements, and AGM notices—so you can self-manage without the spreadsheet headaches.
            </p>
            <SignupForm buttonText="Get early access" dark={true} />
          </Card>

          <h2>Final Thoughts</h2>
          <p>
            Self-managing a strata scheme in WA is legal, practical, and increasingly common—especially for small schemes. But it's not autopilot. You need to understand your legal obligations, stay organised, and be prepared to put in 60-80 hours per year.
          </p>
          <p>
            If you're willing to do the work (or use software to lighten the load), self-management can save thousands of dollars per year while giving you full control over your scheme.
          </p>
          <p>
            If your scheme is complex, or no one has the time, hiring a professional manager is the safer choice.
          </p>
          <p>
            Either way, make the decision consciously—not by default.
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
