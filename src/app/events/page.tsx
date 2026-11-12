import React from "react";
import Link from "next/link";
import { getPublishedEvents } from "@/services/eventService";
import { Calendar, MapPin, Users, Search, Clock, ArrowRight, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Workshops",
  description: "Browse upcoming and past cybersecurity workshops, CTFs, and technical seminars hosted by Shadow Byte Syndicate.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { filter?: string; search?: string; mode?: string };
}) {
  const filter = searchParams.filter === "past" ? "past" : "upcoming";
  const search = searchParams.search || "";
  const mode = searchParams.mode || "ALL";

  const events = await getPublishedEvents({ filter, search, mode });

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Title Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-redDark/20 border border-brand-red/30 rounded-full text-xs font-mono text-brand-redBright uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>OPERATIONAL CALENDAR</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Workshops, CTFs & Seminars
          </h1>
          <p className="text-sm text-brand-gray-muted max-w-2xl font-sans">
            Hands-on technical workshops, competitive cyber war games, and defensive architecture sessions. All registered collegiate students are eligible to participate.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="cyber-panel p-4 rounded-lg border border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Upcoming / Past Tabs */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Link
              href={`/events?filter=upcoming${search ? `&search=${encodeURIComponent(search)}` : ""}${
                mode !== "ALL" ? `&mode=${encodeURIComponent(mode)}` : ""
              }`}
              className={`px-4 py-2 rounded text-xs font-mono font-semibold transition-all ${
                filter === "upcoming"
                  ? "bg-brand-red text-white shadow-red-glow-sm"
                  : "bg-brand-surface text-brand-gray-dim hover:text-white"
              }`}
            >
              UPCOMING EVENTS
            </Link>
            <Link
              href={`/events?filter=past${search ? `&search=${encodeURIComponent(search)}` : ""}${
                mode !== "ALL" ? `&mode=${encodeURIComponent(mode)}` : ""
              }`}
              className={`px-4 py-2 rounded text-xs font-mono font-semibold transition-all ${
                filter === "past"
                  ? "bg-brand-red text-white shadow-red-glow-sm"
                  : "bg-brand-surface text-brand-gray-dim hover:text-white"
              }`}
            >
              PAST ARCHIVES
            </Link>
          </div>

          {/* Search Form */}
          <form method="GET" action="/events" className="flex items-center space-x-2 w-full md:w-auto">
            <input type="hidden" name="filter" value={filter} />
            <div className="relative flex-grow md:w-64">
              <Search className="w-4 h-4 text-brand-gray-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search events..."
                className="w-full pl-9 pr-3 py-1.5 bg-brand-black border border-brand-border rounded text-xs font-mono text-white placeholder-brand-gray-dim focus:outline-none focus:border-brand-red"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-brand-surface hover:bg-brand-card border border-brand-border text-xs font-mono text-white rounded font-medium"
            >
              FILTER
            </button>
          </form>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="p-16 text-center cyber-panel rounded-lg border border-brand-border space-y-3">
            <Calendar className="w-12 h-12 text-brand-gray-dim mx-auto" />
            <h3 className="text-base font-bold text-white font-mono">
              {search || mode !== "ALL"
                ? "No Matching Events Found"
                : filter === "past"
                ? "No past archived events yet."
                : "No upcoming events yet."}
            </h3>
            <p className="text-xs text-brand-gray-muted max-w-sm mx-auto">
              {search || mode !== "ALL"
                ? "No published events match your current search or filter criteria."
                : filter === "past"
                ? "Completed events will appear here after they conclude."
                : "Published workshops, CTFs, and seminars will appear here once scheduled."}
            </p>
            {(search || mode !== "ALL") && (
              <div className="pt-2">
                <Link
                  href={`/events?filter=${filter}`}
                  className="inline-block px-4 py-1.5 bg-brand-surface hover:bg-brand-red border border-brand-border rounded text-xs font-mono text-white transition-all"
                >
                  RESET FILTERS
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => {
              const confirmed = evt._count.registrations;
              const seatsLeft = Math.max(0, evt.capacity - confirmed);
              const isFull = seatsLeft === 0;
              const deadlinePassed = new Date() > new Date(evt.registrationDeadline);

              return (
                <div
                  key={evt.id}
                  className="cyber-panel p-6 rounded-lg border border-brand-border hover:border-brand-red/60 transition-all flex flex-col justify-between group relative"
                >
                  <div className="corner-bracket-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="corner-bracket-br opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-brand-gray-dim mb-3">
                      <span className="px-2 py-0.5 rounded bg-brand-surface text-brand-redBright border border-brand-border">
                        {evt.category}
                      </span>
                      <span className="text-brand-gray-muted">{evt.mode.replace("_", " ")}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-redBright transition-colors line-clamp-2">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-brand-gray-muted leading-relaxed line-clamp-3 mb-4">
                      {evt.summary}
                    </p>

                    <div className="space-y-1.5 text-xs font-mono text-brand-gray-text mb-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                        <span>{new Date(evt.startDate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                        <span>
                          {confirmed} / {evt.capacity} registered
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between">
                    <div>
                      {isFull ? (
                        <span className="text-xs font-mono text-brand-red font-bold">FULL</span>
                      ) : deadlinePassed ? (
                        <span className="text-xs font-mono text-amber-500 font-bold">DEADLINE PASSED</span>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {seatsLeft} SEATS OPEN
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/events/${evt.slug}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-red border border-brand-border hover:border-brand-redBright rounded text-xs font-mono font-bold text-white transition-all"
                    >
                      <span>DETAILS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

