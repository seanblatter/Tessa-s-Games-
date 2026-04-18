"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { YarnSegment } from "@/components/YarnSegment";

type ColumnProps = {
  segments: string[];
  maxHeight: number;
  isSelected: boolean;
  isInvalid: boolean;
  onClick: () => void;
};

function ColumnComponent({ segments, maxHeight, isSelected, isInvalid, onClick }: ColumnProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      animate={
        isInvalid
          ? { x: [0, -5, 5, -4, 4, 0] }
          : {
              x: 0,
            }
      }
      transition={isInvalid ? { duration: 0.3 } : { duration: 0.2 }}
      onClick={onClick}
      className={`flex h-[260px] w-[72px] flex-col-reverse gap-2 rounded-2xl border-2 p-2 transition-colors sm:w-[84px] ${
        isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
      aria-label="Yarn column"
    >
      {Array.from({ length: maxHeight }).map((_, slotIdx) => {
        const segment = segments[slotIdx];

        if (!segment) {
          return <div key={`empty-${slotIdx}`} className="h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50/80" />;
        }

        return <YarnSegment key={`${segment}-${slotIdx}`} color={segment} depth={slotIdx} />;
      })}
    </motion.button>
  );
}

export const Column = memo(ColumnComponent);
