import { Metadata } from "next";
import { getAllConcepts } from "@/content/concepts";
import { LabCatalog } from "@/components/catalog/lab-catalog";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Curriculum Labs",
  description:
    "Explore foundational engineering labs with visual simulators, architectural blueprints, predictive challenges, and multi-language implementations.",
};

export default function LearnPage() {
  const concepts = getAllConcepts();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      {/* Catalog Header */}
      <div className="mb-8 sm:mb-10 lg:mb-12 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-cyan-400">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
          <h1 className="uppercase tracking-wider">Labs Catalog</h1>
        </div>
        <h1 className="font-serif-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          All Available Labs
        </h1>
        <p className="max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed max-w-[72ch]">
          Master software primitives through first-principles theory, interactive visual sandboxes, predictive challenges, step-by-step implementation blueprints, and idiomatic production code in Go, TypeScript, Python, and Java.
        </p>
      </div>

      {/* Interactive Catalog */}
      <LabCatalog concepts={concepts} />
    </div>
  );
}
