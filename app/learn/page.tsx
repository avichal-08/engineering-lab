import { Metadata } from "next";
import { getAllConcepts } from "@/content/concepts";
import { LabCatalog } from "@/components/catalog/lab-catalog";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Engineering Labs Catalog",
  description:
    "Explore 10 foundational distributed systems and resilience engineering concepts with visual simulators, architectural blueprints, and multi-language implementations.",
};

export default function LearnPage() {
  const concepts = getAllConcepts();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Catalog Header */}
      <div className="mb-10 space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
          <Layers className="h-4 w-4" />
          <span className="uppercase tracking-wider">Curriculum Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Distributed Systems & Resilience Labs
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
          Master backend primitives through first-principles theory, interactive visual sandboxes, step-by-step implementation blueprints, and idiomatic production code in Go, TypeScript, Python, and Java.
        </p>
      </div>

      {/* Interactive Catalog */}
      <LabCatalog concepts={concepts} />
    </div>
  );
}
