"use client";

import React, { useEffect, useState } from "react";

interface Section {
  id: string;
  number: string;
  label: string;
}

const sections: Section[] = [
  { id: "overview", number: "01", label: "Overview" },
  { id: "why-it-exists", number: "02", label: "Why It Exists" },
  { id: "how-it-works", number: "03", label: "How It Works" },
  { id: "prove-it", number: "★", label: "Predict: Prove It" },
  { id: "visualize", number: "04", label: "Interactive Visualizer" },
  { id: "build-it", number: "05", label: "Build Step-by-Step" },
  { id: "implementation", number: "06", label: "Code Implementation" },
  { id: "edge-cases", number: "07", label: "Edge Cases & Failures" },
  { id: "production", number: "08", label: "Production Concerns" },
  { id: "tradeoffs", number: "09", label: "Trade-offs" },
  { id: "further-reading", number: "10", label: "Further Reading" },
];

export function SectionSidebar() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-15% 0px -75% 0px",
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="space-y-1.5 font-mono text-xs">
      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-4 px-2">
        Lab Navigation
      </div>
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        const isProveIt = section.id === "prove-it";
        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all duration-150 ${
              isActive
                ? "bg-zinc-900/90 text-zinc-100 font-medium border-l-2 border-cyan-400 pl-2 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 font-normal"
            }`}
          >
            <span
              className={`text-[10px] tabular-nums ${
                isActive
                  ? isProveIt ? "text-amber-400 font-bold" : "text-cyan-400 font-bold"
                  : isProveIt ? "text-amber-500/60" : "text-zinc-600"
              }`}
            >
              {section.number}
            </span>
            <span className={`truncate ${isProveIt ? "italic" : ""}`}>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
