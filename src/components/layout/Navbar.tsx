"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, ShieldAlert, Terminal, ChevronDown } from "lucide-react";
import { ROLES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { profile: session, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const isNavActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Events", href: "/events" },
    { name: "Knowledge Hub", href: "/posts" },
    { name: "Team", href: "/team" },
    { name: "Resources", href: "/resources" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#050508]/90 backdrop-blur-md border-b border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-11 h-11 flex-shrink-0 rounded-full border border-brand-red/40 overflow-hidden bg-brand-card p-0.5 group-hover:border-brand-redBright transition-colors shadow-red-glow-sm">
              <Image
                src="/assets/brand/shield-emblem.png"
                alt="Shadow Byte Syndicate SB Shield Emblem"
                width={44}
                height={44}
                unoptimized
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-base sm:text-lg text-white group-hover:text-brand-redBright transition-colors">
                SHADOW BYTE
              </span>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest text-brand-red uppercase font-semibold">
                SYNDICATE
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    active
                      ? "text-white bg-brand-redDark/40 border border-brand-red/50 shadow-red-glow-sm"
                      : "text-brand-gray-text hover:text-white hover:bg-brand-surface/60"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Buttons / Portals */}
          <div className="hidden lg:flex items-center space-x-3">
            {!loading && session ? (
              <div className="flex items-center space-x-3">
                {session.role === ROLES.SUPER_ADMIN && (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-redDark/60 border border-brand-red text-white text-xs font-mono font-bold rounded shadow-red-glow-sm hover:bg-brand-red transition-all"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>ADMIN COMMAND</span>
                  </Link>
                )}
                {session.role === ROLES.COORDINATOR && (
                  <Link
                    href="/coordinator"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-surface border border-brand-red/60 text-white text-xs font-mono font-bold rounded hover:border-brand-redBright transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-brand-redBright" />
                    <span>COORDINATOR HUB</span>
                  </Link>
                )}
                {session.role === ROLES.STUDENT && (
                  <Link
                    href="/student"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border hover:border-brand-red/60 text-white text-xs font-mono font-bold rounded transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-brand-red" />
                    <span>STUDENT PORTAL</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-mono text-brand-gray-dim hover:text-white transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login/student"
                    className="px-3 py-1.5 bg-brand-red text-white text-xs font-mono font-bold rounded hover:bg-brand-redBright shadow-red-glow-sm transition-all"
                  >
                    STUDENT LOGIN
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="p-1.5 bg-brand-surface border border-brand-border text-brand-gray-text hover:text-white rounded flex items-center text-xs"
                      aria-label="Dedicated Role Portals"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {dropdownOpen && (
                      <div
                        className="absolute right-0 mt-2 w-56 bg-brand-card border border-brand-border rounded shadow-xl py-2 z-50 text-xs font-mono"
                        onMouseLeave={() => setDropdownOpen(false)}
                      >
                        <div className="px-3 py-1 text-[10px] text-brand-gray-dim uppercase tracking-wider">
                          Dedicated Portals
                        </div>
                        <Link
                          href="/login/student"
                          className="block px-3 py-2 text-brand-gray-text hover:bg-brand-surface hover:text-white"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Student Portal (/login/student)
                        </Link>
                        <Link
                          href="/login/coordinator"
                          className="block px-3 py-2 text-brand-gray-text hover:bg-brand-surface hover:text-brand-redBright"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Coordinator Portal (/login/coordinator)
                        </Link>
                        <Link
                          href="/login/super-admin"
                          className="block px-3 py-2 text-brand-gray-text hover:bg-brand-surface hover:text-brand-redBright"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Super Admin Portal (/login/super-admin)
                        </Link>
                        <div className="border-t border-brand-border/60 my-1"></div>
                        <Link
                          href="/register"
                          className="block px-3 py-2 text-brand-red hover:bg-brand-surface font-semibold"
                          onClick={() => setDropdownOpen(false)}
                        >
                          + New Student Signup
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded bg-brand-surface border border-brand-border text-brand-gray-text hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <nav aria-label="Mobile Navigation" className="lg:hidden bg-brand-black border-b border-brand-border px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const active = isNavActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block px-3 py-2 rounded text-base font-medium transition-all ${
                  active
                    ? "text-white bg-brand-redDark/40 border border-brand-red/50"
                    : "text-brand-gray-text hover:text-white hover:bg-brand-surface"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-brand-border/60 space-y-2">
            {session ? (
              <>
                <div className="px-3 py-1 text-xs font-mono text-brand-gray-dim">
                  Signed in as: <span className="text-white">{session.name}</span> ({session.role})
                </div>
                {session.role === ROLES.SUPER_ADMIN && (
                  <Link
                    href="/admin"
                    className="block px-3 py-2 rounded text-sm font-mono font-bold bg-brand-red text-white text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    ADMIN DASHBOARD
                  </Link>
                )}
                {session.role === ROLES.COORDINATOR && (
                  <Link
                    href="/coordinator"
                    className="block px-3 py-2 rounded text-sm font-mono font-bold bg-brand-surface border border-brand-red text-white text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    COORDINATOR DASHBOARD
                  </Link>
                )}
                {session.role === ROLES.STUDENT && (
                  <Link
                    href="/student"
                    className="block px-3 py-2 rounded text-sm font-mono font-bold bg-brand-surface border border-brand-border text-white text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    MY REGISTRATIONS & PROFILE
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full text-center py-2 text-xs font-mono text-brand-gray-dim hover:text-white"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login/student"
                  className="block px-3 py-2 rounded text-sm font-mono font-bold bg-brand-red text-white text-center"
                  onClick={() => setIsOpen(false)}
                >
                  STUDENT LOGIN
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2 rounded text-sm font-mono font-medium border border-brand-border text-white text-center"
                  onClick={() => setIsOpen(false)}
                >
                  STUDENT SIGNUP
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    href="/login/coordinator"
                    className="px-2 py-1.5 rounded text-[11px] font-mono text-center bg-brand-surface text-brand-gray-muted"
                    onClick={() => setIsOpen(false)}
                  >
                    Coordinator Login
                  </Link>
                  <Link
                    href="/login/super-admin"
                    className="px-2 py-1.5 rounded text-[11px] font-mono text-center bg-brand-surface text-brand-gray-muted"
                    onClick={() => setIsOpen(false)}
                  >
                    Super Admin Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

