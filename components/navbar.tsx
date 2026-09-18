"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Terminal, Compass, Layers } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 group-hover:border-emerald-500/40 transition-colors shadow-inner">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Engineering Lab
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider hidden sm:block">
                Systems Education
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            <Link
              href="/learn"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname.startsWith("/learn")
                  ? "bg-zinc-800/80 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              All Labs
            </Link>
            <Link
              href="/learn/rate-limiting"
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
            >
              Featured Lab
            </Link>
          </nav>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>10 Live Interactive Models</span>
          </div>

          <Link
            href="/learn"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-white active:scale-95 transition shadow-sm"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Explore Labs</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
