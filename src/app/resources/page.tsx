import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Terminal, Search, ExternalLink, Bookmark, Code, Shield } from "lucide-react";

export const metadata = {
  title: "Learning Resources",
  description: "Curated cybersecurity labs, war games, and technical roadmaps recommended by Shadow Byte Syndicate.",
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string };
}) {
  const search = searchParams.search || "";
  const category = searchParams.category || "ALL";

  const where: any = {
    isPublished: true,
  };

  if (category !== "ALL") {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const resources = await prisma.resource.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const categories = [
    "ALL",
    "Linux & Wargames",
    "Web Security",
    "Binary Exploitation",
    "Cryptography",
    "Reverse Engineering",
  ];

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>TRAINING ARSENAL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Curated Cybersecurity Resources
          </h1>
          <p className="text-sm text-brand-gray-muted max-w-2xl font-sans">
            Recommended platforms, interactive wargames, and security tooling roadmaps curated by Syndicate researchers.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="cyber-panel p-4 rounded-lg border border-brand-border flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-1 overflow-x-auto w-full pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/resources?category=${encodeURIComponent(cat)}${search ? `&search=${search}` : ""}`}
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

          <form method="GET" action="/resources" className="flex items-center space-x-2 w-full lg:w-auto">
            <input type="hidden" name="category" value={category} />
            <div className="relative flex-grow lg:w-64">
              <Search className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search resources..."
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

        {/* Resources Grid */}
        {resources.length === 0 ? (
          <div className="p-16 text-center cyber-panel rounded-lg border border-brand-border space-y-3">
            <Bookmark className="w-12 h-12 text-brand-gray-dim mx-auto" />
            <h3 className="text-base font-bold text-white">No Resources Found</h3>
            <p className="text-xs text-brand-gray-muted max-w-sm mx-auto">
              No learning guides match the current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((res) => (
              <div
                key={res.id}
                className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-brand-gray-dim mb-3">
                    <span className="px-2 py-0.5 rounded bg-brand-surface text-brand-redBright border border-brand-border">
                      {res.category}
                    </span>
                    <span
                      className={`font-semibold ${
                        res.difficulty === "Beginner"
                          ? "text-emerald-400"
                          : res.difficulty === "Intermediate"
                          ? "text-amber-400"
                          : "text-brand-red"
                      }`}
                    >
                      {res.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors">
                    {res.title}
                  </h3>

                  <p className="text-xs text-brand-gray-muted leading-relaxed mb-4">
                    {res.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-border/60">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-brand-surface hover:bg-brand-redDark/40 border border-brand-border hover:border-brand-red text-center rounded text-xs font-mono font-semibold text-white flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <span>LAUNCH RESOURCE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-red" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
