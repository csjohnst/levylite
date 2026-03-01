import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

export const metadata = {
  title: "Blog | LevyLite - Strata Management Insights for WA",
  description: "Practical advice on strata management in Western Australia, including self-management guides, cost breakdowns, and industry insights.",
};

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
}

const posts: BlogPost[] = [
  {
    slug: "self-manage-strata-wa",
    title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide",
    description: "Everything you need to know about self-managing a strata scheme in Western Australia, from legal requirements to day-to-day operations.",
    date: "2026-03-01",
    readTime: "12 min read",
  },
  {
    slug: "strata-manager-duties",
    title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?)",
    description: "A detailed breakdown of strata manager responsibilities and an honest look at what software can and can't automate.",
    date: "2026-03-01",
    readTime: "10 min read",
  },
  {
    slug: "strata-costs-wa",
    title: "Strata Management Costs in WA: What You're Really Paying For",
    description: "A transparent comparison of professional strata management fees versus self-managed and software-assisted alternatives in Western Australia.",
    date: "2026-03-01",
    readTime: "8 min read",
  },
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-[#02667F] hover:underline text-sm">
            ← Back to LevyLite
          </Link>
          <h1 className="text-4xl font-bold mt-4 text-[#3A3A3A]">Blog</h1>
          <p className="text-lg text-[#3A3A3A]/80 mt-2">
            Practical strata management advice for Western Australia
          </p>
        </div>
      </header>

      {/* Blog Posts */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <h2 className="text-2xl font-bold text-[#3A3A3A] mb-3 hover:text-[#02667F] transition-colors">
                  {post.title}
                </h2>
                <p className="text-[#3A3A3A]/80 mb-4">{post.description}</p>
                <div className="flex items-center gap-4 text-sm text-[#3A3A3A]/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.date).toLocaleDateString("en-AU", { 
                      day: "numeric", 
                      month: "long", 
                      year: "numeric" 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
