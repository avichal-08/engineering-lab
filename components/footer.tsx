import React from "react";
import Link from "next/link";
import { Cpu, GitBranch, ExternalLink, ArrowUpRight } from "lucide-react";
import { GitHubStarButton } from "./github-star-button";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 font-sans text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand & Mission Column (Col 1-5) */}
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
                <Cpu className="h-4 w-4" />
              </div>
              <span className="font-sans font-bold text-sm text-white tracking-tight">
                Engineering Lab
              </span>
            </div>

            <p className="font-mono text-zinc-300 text-xs">
              Build systems. Break systems. Understand systems.
            </p>

            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm max-w-[72ch]">
              An interactive learning platform for distributed systems and resilience engineering.
              Explore primitives through visual models, edge-case simulations, and multi-language production code.
            </p>

            <div className="pt-2">
              <GitHubStarButton />
            </div>
          </div>

          {/* Explore Curriculum (Col 6-8) */}
          <div className="space-y-3 font-mono md:col-span-3">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Curriculum
            </span>
            <ul className="space-y-2 text-zinc-500 text-xs">
              <li>
                <Link href="/learn" className="hover:text-zinc-300 transition">
                  All 10 Labs
                </Link>
              </li>
              <li>
                <Link href="/learn/rate-limiting" className="hover:text-cyan-400 transition">
                  Rate Limiting
                </Link>
              </li>
              <li>
                <Link href="/learn/circuit-breaker" className="hover:text-zinc-300 transition">
                  Circuit Breaker
                </Link>
              </li>
              <li>
                <Link href="/learn/consistent-hashing" className="hover:text-zinc-300 transition">
                  Consistent Hashing
                </Link>
              </li>
              <li>
                <Link href="/learn/distributed-lock" className="hover:text-zinc-300 transition">
                  Distributed Lock
                </Link>
              </li>
              <li>
                <Link href="/learn/replication-quorum" className="hover:text-zinc-300 transition">
                  Replication & Quorum
                </Link>
              </li>
            </ul>
          </div>

          {/* Open Source & Community (Col 9-12) */}
          <div className="space-y-3 font-mono md:col-span-4">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Open Source
            </span>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-xs font-sans">
              Built in public. Have an idea for a new visualizer, better failure mode, or implementation guide?
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <a
                  href="https://github.com/avichal-08/engineering-lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Contribute on GitHub</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>

              <div>
                <a
                  href="https://x.com/Avichal_08"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition"
                >
                  <span>X / @Avichal_08</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Clean Copyright & Identity */}
        <div className="mt-14 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-zinc-500 text-[11px]">
          <div>&copy; {new Date().getFullYear()} Engineering Lab &bull; Free & Open Source</div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/avichal-08/engineering-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition"
            >
              GitHub Repository
            </a>
            <span>&bull;</span>
            <a
              href="https://x.com/Avichal_08"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition"
            >
              @Avichal_08
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
