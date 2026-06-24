"use client";

import { memo } from "react";

type YarnSegmentProps = {
  color: string;
  label: string;
};

function YarnSegmentComponent({ color, label }: YarnSegmentProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span>{label}</span>
      </div>
    </div>
  );
}

export const YarnSegment = memo(YarnSegmentComponent);
