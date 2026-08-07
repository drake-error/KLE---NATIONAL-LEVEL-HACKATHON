import React from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function ShieldMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 56" className={className} role="img" aria-label="ResQ-Plus shield logo">
      <defs>
        <linearGradient id="rp-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 45 9v20c0 13-9 21.5-21 25C12 50.5 3 42 3 29V9L24 2Z"
        fill="url(#rp-shield)"
      />
      <path
        d="M13 36c6-1 5-8 11-9s5-8 11-9"
        fill="none"
        stroke="#e0f2fe"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M22 14h5v5h5v5h-5v5h-5v-5h-5v-5h5v-5Z" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

export function Wordmark({ onNavy = false }) {
  return (
    <span className={cn("text-lg font-extrabold tracking-tight", onNavy ? "text-on-primary" : "text-primary dark:text-primary-fixed-dim")}>
      ResQ<span className="text-[#0ea5e9]">-Plus</span>
    </span>
  );
}

export function Logo({ className, onNavy = false }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <ShieldMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[1.05rem] font-extrabold tracking-tight",
            onNavy ? "text-on-primary" : "text-primary dark:text-primary-fixed-dim",
          )}
        >
          ResQ<span className="text-[#0ea5e9]">-Plus</span>
        </span>
        <span
          className={cn(
            "mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.18em]",
            onNavy ? "text-on-primary/60" : "text-on-surface-variant",
          )}
        >
          Command Center
        </span>
      </span>
    </span>
  );
}
