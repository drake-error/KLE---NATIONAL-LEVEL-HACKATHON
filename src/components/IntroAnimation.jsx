import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export function Intro({ onDone }) {
  const { t } = useI18n();
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
      className={`fixed inset-0 z-[100] grid place-items-center bg-gradient-to-b from-[#060c1d] via-[#0a1128] to-[#0f1d40] text-white transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <span 
          className="absolute top-8 h-40 w-40 rounded-full border border-[#0ea5e9]/40 pointer-events-none" 
          style={{ animation: "rp-radar 2.8s cubic-bezier(0, 0, 0.2, 1) infinite" }}
        />
        <span
          className="absolute top-8 h-40 w-40 rounded-full border border-[#38bdf8]/30 pointer-events-none"
          style={{ animation: "rp-radar 2.8s cubic-bezier(0, 0, 0.2, 1) infinite", animationDelay: "1.1s" }}
        />
        <svg viewBox="0 0 120 140" className="relative h-32 w-28 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
          <path
            d="M60 6 112 24v50c0 32-22 53-52 60C30 127 8 106 8 74V24L60 6Z"
            fill="rgba(56, 189, 248, 0.08)"
            stroke="#38bdf8"
            strokeOpacity="0.8"
            strokeWidth="2"
          />
          <path
            d="M26 96c16-4 12-22 30-26s16-24 34-28"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="180"
            strokeDashoffset="180"
            style={{ animation: "rp-draw 1.6s ease-out 0.2s forwards" }}
          />
          <path
            d="M54 40h12v14h14v12H66v14H54V66H40V54h14V40Z"
            fill="#ffffff"
            opacity="0"
            style={{ animation: "rp-rise 0.6s ease-out 1.1s forwards" }}
          />
        </svg>
        <div className="opacity-0" style={{ animation: "rp-fade-rise 0.8s ease-out 0.9s forwards" }}>
          <p className="text-2xl font-extrabold tracking-tight text-white">
            ResQ<span className="text-[#38bdf8]">-Plus</span>
          </p>
          <p className="mt-2 text-sm text-white/70 font-medium tracking-wide">{t("Preparing emergency network…")}</p>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#38bdf8] via-[#0ea5e9] to-[#0284c7]"
            style={{ animation: "rp-drift 1.4s linear infinite", backgroundSize: "200% 100%" }}
          />
        </div>
      </div>
      <button
        onClick={onDone}
        className="absolute bottom-8 right-8 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        {t("Skip intro")}
      </button>

      <style>{`
        @keyframes rp-radar {
          0% { transform: scale(0.75); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes rp-draw {
          0% { stroke-dashoffset: 180; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes rp-rise {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          100% { opacity: 0.95; transform: translateY(0) scale(1); }
        }
        @keyframes rp-fade-rise {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes rp-drift {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

export function IntroAnimation({ onDone }) {
  return <Intro onDone={onDone} />;
}
