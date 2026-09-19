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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Catalog Header */}
      <div className="mb-10 space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
          <Layers className="h-4 w-4" />
          <span className="uppercase tracking-wider">Curriculum Catalog</span>
        </div>
        <h1 className="font-serif-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Software Systems & Mechanics Labs
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed max-w-[72ch]">
          Master software primitives through first-principles theory, interactive visual sandboxes, predictive challenges, step-by-step implementation blueprints, and idiomatic production code in Go, TypeScript, Python, and Java.
        </p>
      </div>

      {/* Interactive Catalog */}
      <LabCatalog concepts={concepts} />
    </div>
  );
}
