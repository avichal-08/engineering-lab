"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

export function GitHubStarButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStars() {
      try {
        const res = await fetch("https://api.github.com/repos/avichal-08/engineering-lab", {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.stargazers_count === "number") {
            setStars(data.stargazers_count);
          }
        }
      } catch (e) {
        // Fallback silently if offline or rate limited
      }
    }
    fetchStars();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <a
      href="https://github.com/avichal-08/engineering-lab"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition group"
    >
      <Star className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
      <span>Star on GitHub</span>
      {stars !== null && (
        <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400">
          ★ {stars}
        </span>
      )}
    </a>
  );
}
