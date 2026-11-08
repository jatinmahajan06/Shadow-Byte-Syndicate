import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLISH_STATUS } from "@/lib/constants";
import { BookOpen, Search, Calendar, User, ArrowRight, Tag } from "lucide-react";

export const metadata = {
  title: "Knowledge Hub & Research",
  description: "Cybersecurity research write-ups, vulnerability analyses, and technical disclosures by Shadow Byte Syndicate.",
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string };
}) {
  const search = searchParams.search || "";
  const category = searchParams.category || "ALL";

  const where: any = {
    status: PUBLISH_STATUS.PUBLISHED,
  };

  if (category !== "ALL") {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
      { content: { contains: search } },
      { tags: { contains: search } },
    ];
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    include: {
      createdBy: { select: { name: true, role: true } },
    },
  });

  const categories = [
    "ALL",
    "Security Research",
    "Defensive Security",
    "Web Security",
    "Binary Exploitation",
    "Reverse Engineering",
    "Digital Forensics",
  ];

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>KNOWLEDGE HUB</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Security Research & Technical Publications
          </h1>
          <p className="text-sm text-brand-gray-muted max-w-2xl font-sans">
            Independent student research, write-ups on critical CVEs, exploit mitigation deep-dives, and CTF solution dossiers.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="cyber-panel p-4 rounded-lg border border-brand-border flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Categories Pill Nav */}
          <div className="flex items-center space-x-1 overflow-x-auto w-full pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/posts?category=${encodeURIComponent(cat)}${search ? `&search=${search}` : ""}`}
                className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all ${
                  category === cat
                    ? "bg-brand-red text-white font-bold shadow-red-glow-sm"
                    : "bg-brand-surface text-brand-gray-dim hover:text-white"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Search Input */}
          <form method="GET" action="/posts" className="flex items-center space-x-2 w-full lg:w-auto">
            <input type="hidden" name="category" value={category} />
            <div className="relative flex-grow lg:w-64">
              <Search className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search articles..."
                className="w-full pl-9 pr-3 py-1.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white placeholder-brand-gray-dim focus:outline-none focus:border-brand-red"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-brand-surface hover:bg-brand-card border border-brand-border text-xs font-mono text-white rounded font-medium"
            >
              SEARCH
            </button>
          </form>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="p-16 text-center cyber-panel rounded-lg border border-brand-border space-y-3">
            <BookOpen className="w-12 h-12 text-brand-gray-dim mx-auto" />
            <h3 className="text-base font-bold text-white">No Articles Found</h3>
            <p className="text-xs text-brand-gray-muted max-w-sm mx-auto">
              No published articles match the selected category or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group relative"
              >
                <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-brand-gray-dim mb-3">
                    <span className="text-brand-redBright font-semibold">
                      // {post.category.toUpperCase()}
                    </span>
                    <span>
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-brand-gray-muted leading-relaxed line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-brand-gray-dim">
                    By {post.createdBy.name}
                  </span>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-mono text-brand-red hover:text-brand-redBright font-bold transition-colors"
                  >
                    <span>READ DOSSIER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
