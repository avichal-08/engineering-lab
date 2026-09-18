import React from "react";
import { BookOpen, ExternalLink, FileText, Bookmark } from "lucide-react";

export interface ReadingResource {
  title: string;
  source: string;
  oneLineTakeaway: string;
  category: "RFC" | "Engineering Blog" | "Academic Paper" | "System Architecture";
  url?: string;
}

interface FurtherReadingGridProps {
  resources: ReadingResource[];
}

export function FurtherReadingGrid({ resources }: FurtherReadingGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
      {resources.map((item, i) => (
        <div
          key={i}
          className="group rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-3 flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-200"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  item.category === "RFC"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                    : item.category === "Academic Paper"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {item.category}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">{item.source}</span>
            </div>

            <h4 className="font-mono text-sm font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
              {item.title}
            </h4>

            <p className="text-xs text-zinc-400 leading-relaxed max-w-[72ch]">
              {item.oneLineTakeaway}
            </p>
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-cyan-400 hover:text-cyan-300 pt-2 transition"
            >
              <span>Read Original Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
