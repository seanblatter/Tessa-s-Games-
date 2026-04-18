"use client";

import { motion } from "framer-motion";
import { DRAGON_MAX } from "@/lib/gameLogic";

type DragonProps = {
  dragonSize: number;
};

export default function Dragon({ dragonSize }: DragonProps) {
  const ratio = Math.min(dragonSize / DRAGON_MAX, 1);
  const scale = 0.8 + ratio * 0.5;

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Dragon Pressure</span>
        <span>{dragonSize}/{DRAGON_MAX}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div className="h-full rounded-full bg-rose-500" animate={{ width: `${ratio * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 25 }} />
      </div>
      <div className="grid place-items-center pt-2">
        <motion.svg
          animate={{ scale, rotate: ratio * 4 }}
          transition={{ type: "spring", stiffness: 180, damping: 15 }}
          width="160"
          height="120"
          viewBox="0 0 160 120"
          role="img"
          aria-label="Crocheted dragon"
        >
          <circle cx="80" cy="72" r="34" fill="#16a34a" />
          <circle cx="110" cy="40" r="20" fill="#22c55e" />
          <circle cx="65" cy="68" r="3.5" fill="#0f172a" />
          <circle cx="96" cy="35" r="2.6" fill="#0f172a" />
          <circle cx="119" cy="35" r="2.6" fill="#0f172a" />
          <path d="M58 84 Q80 94 102 84" stroke="#14532d" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M30 76 Q18 66 24 50 Q38 54 45 65" fill="#4ade80" />
          <path d="M126 70 Q146 58 142 42 Q128 46 118 58" fill="#4ade80" />
          <path d="M72 20 L85 4 L99 20" fill="#10b981" />
        </motion.svg>
      </div>
    </div>
  );
}
