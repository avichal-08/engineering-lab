import Link from "next/link";
import { getAllConcepts } from "@/content/concepts";
import { RequestFlowHero } from "@/components/learning/request-flow-hero";
import { HorizontalJourney } from "@/components/learning/horizontal-journey";
import {
  ArrowRight,
  Terminal,
  Activity,
  FileCode2,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const concepts = getAllConcepts();

  return (
    <div className="space-y-24 py-12 md:py-20 font-sans">
      {/* 1. HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-1 font-mono text-xs text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Interactive Engineering Education</span>
          </div>

          {/* New Requested Headline */}
          <h1 className="font-serif-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Stop memorizing distributed systems.{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Start building them.
            </span>
          </h1>

          {/* New Requested Supporting Text */}
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl max-w-[72ch]">
            Explore engineering primitives through interactive simulations, failure scenarios, implementation walkthroughs, and production-grade code.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/learn"
              className="flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-white active:scale-95 transition shadow-lg"
            >
              <Terminal className="h-4 w-4" />
              <span>Explore Labs</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/learn/rate-limiting"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-3 text-sm font-medium text-zinc-300 hover:border-cyan-500/50 hover:text-white transition"
            >
              <Zap className="h-4 w-4 text-cyan-400" />
              <span>Try Rate Limiting</span>
            </Link>
          </div>
        </div>

        {/* Hero Visual: Animated SVG + Motion Request Flow (Client -> Gateway -> Limiter -> Service + 429 branch) */}
        <div className="mt-14 max-w-5xl mx-auto">
          <RequestFlowHero />
        </div>
      </section>

      {/* 2. HORIZONTAL LEARNING JOURNEY (Replaces Why Engineering Lab) */}
      <section className="border-y border-zinc-800/80 bg-zinc-950/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HorizontalJourney />
        </div>
      </section>

      {/* 3. LABS LIBRARY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              Curriculum Catalog
            </span>
            <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              10 Foundational Labs
            </h2>
          </div>

          <Link
            href="/learn"
            className="flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View Full Catalog & Filters</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concepts.map((concept) => (
            <Link
              key={concept.slug}
              href={`/learn/${concept.slug}`}
              className="group rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 space-y-3 hover:border-zinc-700 hover:bg-zinc-900/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>{concept.category}</span>
                  <span className="text-cyan-400">{concept.difficulty}</span>
                </div>
                <h3 className="font-mono text-base font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
                  {concept.title}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed max-w-[72ch]">
                  {concept.shortDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500 group-hover:text-cyan-400 transition-colors">
                <span>{concept.estimatedTime}</span>
                <span className="flex items-center gap-1 font-semibold">
                  Launch Lab <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. BOTTOM CALL TO ACTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <h2 className="font-serif-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to master distributed engineering?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed max-w-[72ch]">
            Start with Rate Limiting, experiment with the interactive simulators, and implement resilient systems from scratch.
          </p>
          <div>
            <Link
              href="/learn/rate-limiting"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-xs font-semibold text-zinc-950 hover:bg-cyan-300 active:scale-95 transition shadow-lg"
            >
              <Terminal className="h-4 w-4" />
              <span>Launch Rate Limiter Lab</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
