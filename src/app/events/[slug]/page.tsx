import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";
import EventRegistrationButton from "@/components/events/EventRegistrationButton";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Shield,
  ArrowLeft,
  Share2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
  });

  if (!event) return { title: "Event Not Found" };

  return {
    title: `${event.title} | Events`,
    description: event.summary,
  };
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      createdBy: { select: { name: true, role: true } },
      _count: {
        select: { registrations: { where: { status: "CONFIRMED" } } },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Check if current user is registered
  let isRegistered = false;
  let userRegStatus: string | undefined = undefined;

  if (user) {
    const reg = await prisma.eventRegistration.findUnique({
      where: {
        eventId_studentId: {
          eventId: event.id,
          studentId: user.id,
        },
      },
    });

    if (reg && reg.status === "CONFIRMED") {
      isRegistered = true;
      userRegStatus = reg.status;
    }
  }

  const confirmedCount = event._count.registrations;
  const seatsLeft = Math.max(0, event.capacity - confirmedCount);
  const isFull = seatsLeft === 0;
  const now = new Date();
  const deadlinePassed = now > event.registrationDeadline;
  const eventEnded = now > event.endDate;

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Back Link */}
        <Link
          href="/events"
          className="inline-flex items-center space-x-2 text-xs font-mono text-brand-gray-dim hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-brand-red" />
          <span>&lt; BACK TO ALL EVENTS</span>
        </Link>

        {/* Header Block */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-border space-y-6 relative">
          <div className="corner-bracket-tl"></div>
          <div className="corner-bracket-tr"></div>
          <div className="corner-bracket-bl"></div>
          <div className="corner-bracket-br"></div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <span className="px-3 py-1 bg-brand-surface border border-brand-border rounded text-brand-redBright font-bold">
              {event.category.toUpperCase()}
            </span>
            <span className="text-brand-gray-muted">
              MODE: <strong className="text-white">{event.mode.replace("_", " ")}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {event.title}
          </h1>

          <p className="text-sm sm:text-base text-brand-gray-text leading-relaxed font-sans">
            {event.summary}
          </p>

          {/* Key Metadata Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-brand-border/60 text-xs font-mono">
            <div className="flex items-start space-x-2.5">
              <Calendar className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-gray-dim block text-[10px] uppercase">Date & Time</span>
                <span className="text-white font-medium">
                  {new Date(event.startDate).toLocaleDateString()}
                </span>
                <span className="text-brand-gray-muted block text-[11px]">
                  {new Date(event.startDate).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-gray-dim block text-[10px] uppercase">Location / Venue</span>
                <span className="text-white font-medium line-clamp-1">{event.venue}</span>
                {event.locationUrl && (
                  <a
                    href={event.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-brand-red hover:underline flex items-center space-x-1"
                  >
                    <span>Maps link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <Clock className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-gray-dim block text-[10px] uppercase">
                  Registration Closes
                </span>
                <span className="text-white font-medium">
                  {new Date(event.registrationDeadline).toLocaleDateString()}
                </span>
                <span className="text-brand-gray-muted block text-[11px]">
                  {new Date(event.registrationDeadline).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <Users className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-gray-dim block text-[10px] uppercase">Capacity</span>
                <span className="text-white font-medium">
                  {confirmedCount} / {event.capacity} seats
                </span>
                <span
                  className={`block text-[11px] ${
                    isFull ? "text-brand-red font-bold" : "text-emerald-400"
                  }`}
                >
                  {isFull ? "Sold Out" : `${seatsLeft} seats remaining`}
                </span>
              </div>
            </div>
          </div>

          {/* Registration CTA Trigger */}
          <div className="pt-6 border-t border-brand-border/60">
            <EventRegistrationButton
              eventId={event.id}
              isLoggedIn={Boolean(user)}
              userRole={user?.role}
              isRegistered={isRegistered}
              registrationStatus={userRegStatus}
              isFull={isFull}
              deadlinePassed={deadlinePassed}
              isOpen={event.isRegistrationOpen && !eventEnded}
            />
          </div>
        </div>

        {/* Detailed Body Section */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg border border-brand-border space-y-6">
          <div className="border-l-2 border-brand-red pl-3">
            <span className="text-xs font-mono text-brand-red uppercase tracking-widest block">
              BRIEFING DOSSIER
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Event Curriculum & Instructions</h2>
          </div>

          <div
            className="prose prose-invert prose-red max-w-none text-xs sm:text-sm text-brand-gray-text leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description.replace(/\n/g, "<br>")) }}
          />

          <div className="pt-6 border-t border-brand-border/60 text-xs font-mono text-brand-gray-dim flex items-center justify-between">
            <span>Posted by: {event.createdBy.name}</span>
            <span>Syndicate Timezone: Asia/Kolkata</span>
          </div>
        </div>
      </div>
    </div>
  );
}
