import React from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function ShieldMark({ className }) {
  return (
    <svg viewBox="0 0 48 56" className={cn("h-8 w-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="resq-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.14 226)" />
          <stop offset="100%" stopColor="oklch(0.42 0.13 258)" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 4 10v20c0 12 8.6 20.4 20 24 11.4-3.6 20-12 20-24V10L24 2Z"
        fill="url(#resq-shield)"
      />
      <path
        d="M13 34c4-1 5-9 9-9s5 6 8 6 3-9 5-11"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <rect x="21" y="12" width="6" height="14" rx="1.6" fill="white" opacity="0.95" />
      <rect x="17" y="16" width="14" height="6" rx="1.6" fill="white" opacity="0.95" />
    </svg>
  );
}

export function Logo({ className, onNavy = false }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <ShieldMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[1.05rem] font-extrabold tracking-tight",
            onNavy ? "text-on-primary" : "text-primary dark:text-primary-fixed-dim",
          )}
        >
          ResQ<span className="text-[#0ea5e9]">Plus</span>
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
