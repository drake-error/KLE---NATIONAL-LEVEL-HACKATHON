import React, { useEffect, useState } from "react";
import { ShieldMark } from "./Logo";

export function IntroAnimation({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2300);
    const t2 = setTimeout(onDone, 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" 
           style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative grid place-items-center">
        <span className="absolute h-32 w-32 rounded-full border border-primary/50 animate-ping" style={{ animationDuration: '3s' }} />
        <span
          className="absolute h-32 w-32 rounded-full border border-primary/40 animate-ping"
          style={{ animationDuration: '3s', animationDelay: "0.9s" }}
        />
        <div className="relative grid h-28 w-28 place-items-center rounded-3xl border border-on-background/15 bg-on-background/5 backdrop-blur-sm">
          <ShieldMark className="h-14 w-14" />
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
            <path
              d="M10 92 C 34 92, 38 54, 60 54 S 86 30, 112 28"
              fill="none"
              stroke="oklch(0.72 0.14 226)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="900"
              style={{ animation: "draw-route 1.8s cubic-bezier(0.4,0,0.2,1) forwards" }}
            />
          </svg>
        </div>
      </div>

      <p className="mt-10 text-sm font-medium tracking-[0.22em] text-on-background/80 uppercase">
        Preparing emergency network…
      </p>
      <div className="mt-4 h-[3px] w-52 overflow-hidden rounded-full bg-on-background/15 relative">
        <span className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-primary-fixed-dim to-primary" style={{ animation: "shimmer-line 1.4s ease-in-out infinite" }} />
      </div>

      <button
        onClick={onDone}
        className="absolute bottom-8 right-8 rounded-full border border-on-background/25 px-4 py-2 text-xs font-medium text-on-background/75 transition-colors hover:bg-on-background/10 hover:text-on-background"
      >
        Skip intro
      </button>
      
      <style>{`
        @keyframes draw-route {
          0% { stroke-dashoffset: 900; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes shimmer-line {
          0% { left: -33%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
