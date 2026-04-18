"use client";

import { memo } from "react";
import { motion } from "framer-motion";

type YarnSegmentProps = {
  color: string;
  depth: number;
};

function YarnSegmentComponent({ color, depth }: YarnSegmentProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: depth * 0.015 }}
      className="h-12 w-full rounded-xl border border-white/40 shadow-inner"
      style={{ backgroundColor: color }}
    />
  );
}

export const YarnSegment = memo(YarnSegmentComponent);
