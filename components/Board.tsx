"use client";

import { memo } from "react";
import { Column } from "@/components/Column";

type BoardProps = {
  columns: string[][];
  selectedColumn: number | null;
  invalidTarget: number | null;
  maxHeight: number;
  onSelectColumn: (index: number) => void;
};

function BoardComponent({ columns, selectedColumn, invalidTarget, maxHeight, onSelectColumn }: BoardProps) {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="mx-auto flex min-w-max items-end gap-3 rounded-3xl bg-slate-100 p-4 sm:gap-4 sm:p-6">
        {columns.map((column, index) => (
          <Column
            key={`column-${index}`}
            segments={column}
            maxHeight={maxHeight}
            isSelected={selectedColumn === index}
            isInvalid={invalidTarget === index}
            onClick={() => onSelectColumn(index)}
          />
        ))}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
