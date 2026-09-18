"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Concept, Category, Difficulty } from "@/content/concepts";
import { Search, Clock, ArrowRight, Sparkles, Filter } from "lucide-react";

interface LabCatalogProps {
  concepts: Concept[];
}

export function LabCatalog({ concepts }: LabCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");

  const categories = ["All", "Resilience", "Data", "Messaging", "Distributed Systems"];
  const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

  const filteredConcepts = useMemo(() => {
    return concepts.filter((concept) => {
      // Category match
      if (selectedCategory !== "All" && concept.category !== selectedCategory) {
        return false;
      }

      // Difficulty match
      if (selectedDifficulty !== "All" && concept.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search query match
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesTitle = concept.title.toLowerCase().includes(query);
        const matchesDesc = concept.shortDescription.toLowerCase().includes(query);
        const matchesTopics = concept.topics.some((t) => t.toLowerCase().includes(query));
        const matchesSlug = concept.slug.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesTopics || matchesSlug;
      }

      return true;
    });
  }, [concepts, searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-8 font-sans">
      {/* Controls Bar: Search + Category Filters */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by primitive, keyword, or topic (e.g., token bucket, quorum, redlock, bloom)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 shadow-inner focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-2.5 text-xs font-mono text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedCategory === cat
                    ? "bg-zinc-800 text-white font-semibold border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-zinc-500 text-[11px]">DIFFICULTY:</span>
            {difficulties.map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded text-[11px] transition ${
                  selectedDifficulty === diff
                    ? "bg-zinc-800 text-white font-medium border border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Concept Cards */}
      {filteredConcepts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-12 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
            <Filter className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No matching labs found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search keywords or resetting your category filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setSelectedDifficulty("All");
            }}
            className="mt-2 text-xs font-mono text-emerald-400 hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConcepts.map((concept) => (
            <Link
              key={concept.slug}
              href={`/learn/${concept.slug}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
            >
              <div className="space-y-3">
                {/* Meta Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {concept.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] ${
                        concept.difficulty === "Beginner"
                          ? "text-emerald-400"
                          : concept.difficulty === "Intermediate"
                          ? "text-cyan-400"
                          : "text-purple-400"
                      }`}
                    >
                      {concept.difficulty}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{concept.estimatedTime}</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">
                  {concept.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {concept.shortDescription}
                </p>

                {/* Topics Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {concept.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
                    >
                      {topic}
                    </span>
                  ))}
                  {concept.topics.length > 3 && (
                    <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                      +{concept.topics.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-zinc-800/60 pt-4 text-xs font-mono text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400">
                  Interactive Simulator Included
                </span>
                <span className="flex items-center gap-1 font-medium">
                  Launch Lab <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
