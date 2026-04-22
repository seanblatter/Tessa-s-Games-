"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { YarnPath } from "@/lib/gameLogic";

type ColumnProps = {
  yarn: YarnPath;
  selected: boolean;
  onClick: () => void;
};

function ColumnComponent({ yarn, selected, onClick }: ColumnProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl border p-3 text-left ${selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: yarn.color }} />
        <p className="text-sm font-semibold capitalize text-slate-800">{yarn.id} yarn</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Route: {yarn.path.join(" → ")}
      </p>
    </motion.button>
  );
}

export const Column = memo(ColumnComponent);
