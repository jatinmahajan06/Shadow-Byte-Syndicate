import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { BookOpen, Calendar, User, ArrowLeft, Tag, ShieldCheck } from "lucide-react";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
  });

  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | Knowledge Hub`,
    description: post.excerpt,
  };
}

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
    include: {
      createdBy: { select: { name: true, role: true } },
    },
  });

  if (!post) {
    notFound();
  }

  const tagsList = post.tags ? post.tags.split(",").map((t) => t.trim()) : [];

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Back Link */}
        <Link
          href="/posts"
          className="inline-flex items-center space-x-2 text-xs font-mono text-brand-gray-dim hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-brand-red" />
          <span>&lt; BACK TO ALL PUBLICATIONS</span>
        </Link>

        {/* Header Hero */}
        <div className="cyber-panel p-6 sm:p-10 rounded-lg border border-brand-border space-y-6 relative">
          <div className="corner-bracket-tl"></div>
          <div className="corner-bracket-tr"></div>
          <div className="corner-bracket-bl"></div>
          <div className="corner-bracket-br"></div>

          <div className="inline-block px-3 py-1 bg-brand-surface border border-brand-border rounded text-xs font-mono text-brand-redBright font-bold">
            // {post.category.toUpperCase()}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-brand-gray-text leading-relaxed font-sans border-l-2 border-brand-red pl-3">
            {post.excerpt}
          </p>

          <div className="pt-4 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-brand-gray-dim">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-red" />
              <span>Author: <strong className="text-white">{post.createdBy.name}</strong> ({post.createdBy.role})</span>
            </div>
            {post.publishedAt && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-red" />
                <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="cyber-panel p-6 sm:p-10 rounded-lg border border-brand-border space-y-6">
          <div
            className="prose prose-invert prose-red max-w-none text-xs sm:text-sm text-brand-gray-text leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content.replace(/\n/g, "<br>")) }}
          />

          {tagsList.length > 0 && (
            <div className="pt-6 border-t border-brand-border/60 flex items-center space-x-2 flex-wrap gap-2">
              <Tag className="w-3.5 h-3.5 text-brand-red" />
              <span className="text-xs font-mono text-brand-gray-dim">Tags:</span>
              {tagsList.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[11px] font-mono text-brand-gray-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Ethics Note */}
          <div className="p-4 bg-brand-surface/40 rounded border border-brand-border/80 flex items-start space-x-3 text-xs font-mono text-brand-gray-muted">
            <ShieldCheck className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Responsible Disclosure Notice:</strong> All vulnerability analysis in Shadow Byte Syndicate research dossiers has been responsibly coordinated with impacted software maintainers or demonstrated using dedicated isolated mock environments.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
