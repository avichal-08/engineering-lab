"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Terminal, Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400 group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-all shadow-inner">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-semibold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Engineering Lab
              </span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
                Systems Education
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            <Link
              href="/learn"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/learn"
                  ? "bg-zinc-800/80 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
              }`}
            >
              All Labs
            </Link>
            <Link
              href="/learn/rate-limiting"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/learn/rate-limiting"
                  ? "bg-zinc-800/80 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
              }`}
            >
              Featured Lab
            </Link>
          </nav>
        </div>

        {/* Right: Capability Indicator & Primary CTA (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>10 Interactive Labs</span>
          </div>

          <Link
            href="/learn"
            className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white active:scale-95 transition shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Explore Labs</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/learn"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white transition shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Labs</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-400 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>10 Interactive Labs</span>
          </div>

          <div className="flex flex-col space-y-1">
            <Link
              href="/learn"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md transition ${
                pathname === "/learn"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              All Labs
            </Link>
            <Link
              href="/learn/rate-limiting"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md transition ${
                pathname === "/learn/rate-limiting"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Featured Lab: Rate Limiting
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
