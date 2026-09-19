"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Menu, X, ArrowRight } from "lucide-react";
import { InvariantsLogo } from "@/components/brand/invariants-logo";
import { siteConfig } from "@/lib/site-config";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md shadow-lg shadow-black/20"
          : "border-b border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/90 border border-zinc-800 text-cyan-400 group-hover:border-cyan-500/50 group-hover:text-cyan-300 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all shadow-inner">
              <InvariantsLogo className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                {siteConfig.name}
              </span>
              <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
                Software Mechanics
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            <Link
              href="/learn"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/learn"
                  ? "bg-zinc-800/90 text-white font-medium shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
              }`}
            >
              All Labs
            </Link>
            <Link
              href="/learn/rate-limiting"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === "/learn/rate-limiting"
                  ? "bg-zinc-800/90 text-white font-medium shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
              }`}
            >
              Featured Lab
            </Link>
          </nav>
        </div>

        {/* Right: Capability Indicator & Primary CTA (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800/90 bg-zinc-900/60 font-mono text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Interactive Labs</span>
          </div>

          <Link
            href="/learn"
            className="flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3.5 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:border-cyan-500/60 hover:text-white hover:bg-zinc-800/90 active:scale-95 transition-all shadow-sm group"
          >
            <Terminal className="h-3.5 w-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span>Explore Labs</span>
            <ArrowRight className="h-3 w-3 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/learn"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:border-cyan-500/50 transition shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
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
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 py-4 space-y-3 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-400 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Interactive Labs</span>
          </div>

          <div className="flex flex-col space-y-1 pt-1">
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
