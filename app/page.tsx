import Link from "next/link";
import { getAllConcepts } from "@/content/concepts";
import { RequestFlowHero } from "@/components/learning/request-flow-hero";
import { HorizontalJourney } from "@/components/learning/horizontal-journey";
import { HeroExperimentControl } from "@/components/learning/hero-experiment-control";
import { HeroSystemMesh } from "@/components/learning/hero-system-mesh";
import { siteConfig } from "@/lib/site-config";
import {
  ArrowRight,
  Terminal,
} from "lucide-react";

export default function HomePage() {
  const concepts = getAllConcepts();

  return (
    <div className="space-y-28 md:space-y-36 py-12 md:py-20 font-sans relative">
      {/* 1. HERO SCENE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Living Engineering System Background Mesh */}
        <HeroSystemMesh />

        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto relative z-10">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-1 font-mono text-xs text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{siteConfig.heroEyebrow}</span>
          </div>

          {/* Headline - Explicit Two-Line Split */}
          <h1 className="font-serif-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            <span className="block">{siteConfig.heroHeadlinePrefix}</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              {siteConfig.heroHeadlineAccent}
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl max-w-[72ch]">
            {siteConfig.heroBody}
          </p>

          {/* Interactive Hero Experiment Control Surface */}
          <div className="w-full pt-1">
            <HeroExperimentControl />
          </div>
        </div>

        {/* Live System Simulation Canvas */}
        <div className="mt-14 md:mt-16 max-w-5xl mx-auto relative z-10">
          <RequestFlowHero />
        </div>
      </section>

      {/* 2. THE INVARIANTS LOOP SCENE */}
      <section className="border-y border-zinc-800/80 bg-zinc-950/60 py-24 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HorizontalJourney />
        </div>
      </section>

      {/* 3. LABS CATALOG SCENE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              Curriculum Catalog
            </span>
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Foundational Labs
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
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
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

              <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500 group-hover:text-cyan-400 transition-colors">
                <span>{concept.estimatedTime}</span>
                <span className="flex items-center gap-1 font-semibold">
                  Run Experiment <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. BOTTOM CALL TO ACTION SCENE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <h2 className="font-serif-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to understand how software works?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed max-w-[72ch]">
            Simulate token exhaustion, predict circuit tripping under load, and verify monotonic fencing tokens.
          </p>
          <div>
            <Link
              href="/learn/rate-limiting"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-xs font-semibold text-zinc-950 hover:bg-cyan-300 active:scale-95 transition shadow-lg font-mono"
            >
              <Terminal className="h-4 w-4" />
              <span>Run Rate Limiter Experiment</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
