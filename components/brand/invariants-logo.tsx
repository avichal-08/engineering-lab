import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function InvariantsLogo({ className = "h-5 w-5", size = 20 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stable equilibrium invariant: 3 interconnected nodes around a central anchor */}
      <path
        d="M12 3L20 8.5V15.5L12 21L4 15.5V8.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-40"
      />
      <path
        d="M12 8L16 11V15L12 17L8 15V11L12 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cyan-400"
      />
      {/* Central equilibrium invariant nexus */}
      <circle cx="12" cy="12.5" r="1.5" fill="currentColor" className="text-cyan-300" />
      {/* Dynamic connection vertices */}
      <circle cx="12" cy="3" r="1" fill="currentColor" className="opacity-70" />
      <circle cx="20" cy="8.5" r="1" fill="currentColor" className="opacity-70" />
      <circle cx="20" cy="15.5" r="1" fill="currentColor" className="opacity-70" />
      <circle cx="12" cy="21" r="1" fill="currentColor" className="opacity-70" />
      <circle cx="4" cy="15.5" r="1" fill="currentColor" className="opacity-70" />
      <circle cx="4" cy="8.5" r="1" fill="currentColor" className="opacity-70" />
    </svg>
  );
}
