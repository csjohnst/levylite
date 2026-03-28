import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Calendar, ArrowRight } from "lucide-react";
import Image from "next/image";

export const metadata = {
  title: "Strata Management Guides & Resources | LevyLite Blog",
  description: "Expert guides on self-managing strata in WA, understanding strata costs, and navigating Australian strata legislation. Practical advice for small operators.",
  openGraph: {
    title: "Strata Management Guides & Resources | LevyLite Blog",
    description: "Expert guides on self-managing strata in WA, understanding strata costs, and navigating Australian strata legislation.",
    type: "website",
  },
};

const blogPosts = [
  {
    slug: "how-to-self-manage-strata-wa",
    title: "How to Self-Manage Your Strata in WA — A Step-by-Step Guide",
    excerpt: "A practical guide to self-managing your strata scheme in Western Australia. Learn the legal requirements, responsibilities, and tools you need to succeed without paying thousands in management fees.",
    date: "2026-02-25",
    readTime: "8 min read",
  },
  {
    slug: "what-does-strata-manager-do",
    title: "What Does a Strata Manager Actually Do? (And Can Software Replace Them?)",
    excerpt: "Understanding the real value of strata managers and when DIY strata management with modern software makes more sense for small schemes. An honest breakdown of duties and alternatives.",
    date: "2026-02-25",
    readTime: "7 min read",
  },
  {
    slug: "strata-management-costs-wa",
    title: "Strata Management Costs in WA: What You're Really Paying For",
    excerpt: "A transparent breakdown of strata management fees in Western Australia. Learn what's included, what's extra, and how to calculate if you're getting value for money on small schemes.",
    date: "2026-02-25",
    readTime: "6 min read",
  },
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#02667F] to-[#0090B7] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center mb-6 hover:opacity-80 transition-opacity">
            <Image 
              src="/kokoro-logo.png" 
              alt="Kokoro Software" 
              width={48} 
              height={48}
              className="mr-3"
            />
            <span className="text-xl font-semibold">LevyLite</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Strata Management Guides
          </h1>
          <p className="text-xl text-white/90">
            Practical advice for small strata schemes in Western Australia
          </p>
        </div>
      </header>

      {/* Blog Posts */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-[#02667F]">
                  <div className="flex items-center gap-4 text-sm text-[#3A3A3A]/60 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.date).toLocaleDateString('en-AU', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#3A3A3A] mb-3 group-hover:text-[#02667F] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[#3A3A3A]/80 mb-4">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 text-[#02667F] font-semibold">
                    Read more
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#3A3A3A] mb-4">
            Ready to try modern strata management?
          </h2>
          <p className="text-xl text-[#3A3A3A]/80 mb-8">
            LevyLite starts free for schemes up to 5 lots. No credit card required.
          </p>
          <Link 
            href="/#signup" 
            className="inline-block bg-[#02667F] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#024d5f] transition-colors"
          >
            Get early access
          </Link>
        </div>
      </section>
    </div>
  );
}
