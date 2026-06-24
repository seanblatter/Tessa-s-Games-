"use client";

import { memo, useEffect, useMemo, useRef, type PointerEvent } from "react";
import type { GraphNode, YarnPath } from "@/lib/gameLogic";

type BoardProps = {
  nodes: Record<string, GraphNode>;
  yarns: YarnPath[];
  selectedYarn: string | null;
  invalidMoveFlash: boolean;
  onPickYarn: (id: string) => void;
  onPickNode: (id: string) => void;
};

const WIDTH = 440;
const HEIGHT = 440;

function pointSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function BoardComponent({ nodes, yarns, selectedYarn, invalidMoveFlash, onPickYarn, onPickNode }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const edges = useMemo(() => {
    const unique = new Set<string>();
    const lines: Array<[GraphNode, GraphNode]> = [];

    Object.values(nodes).forEach((node) => {
      node.connections.forEach((connectionId) => {
        const key = [node.id, connectionId].sort().join("-");
        if (!unique.has(key) && nodes[connectionId]) {
          unique.add(key);
          lines.push([node, nodes[connectionId]]);
        }
      });
    });

    return lines;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, WIDTH, HEIGHT);

    context.lineWidth = 4;
    context.strokeStyle = "#cbd5e1";
    edges.forEach(([from, to]) => {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    });

    yarns.forEach((yarn) => {
      context.beginPath();
      context.strokeStyle = yarn.color;
      context.lineWidth = selectedYarn === yarn.id ? 10 : 8;
      context.lineCap = "round";
      context.lineJoin = "round";

      yarn.path.forEach((nodeId, index) => {
        const node = nodes[nodeId];
        if (!node) return;
        if (index === 0) context.moveTo(node.x, node.y);
        else context.lineTo(node.x, node.y);
      });

      context.stroke();
    });

    Object.values(nodes).forEach((node) => {
      context.beginPath();
      context.fillStyle = "#0f172a";
      context.arc(node.x, node.y, 9, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.fillStyle = "#f8fafc";
      context.arc(node.x, node.y, 4, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#334155";
      context.font = "11px sans-serif";
      context.fillText(node.id, node.x - 4, node.y - 14);
    });
  }, [edges, nodes, selectedYarn, yarns]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;

    for (const node of Object.values(nodes)) {
      const distance = Math.hypot(x - node.x, y - node.y);
      if (distance < 18) {
        onPickNode(node.id);
        return;
      }
    }

    for (const yarn of yarns) {
      for (let i = 1; i < yarn.path.length; i += 1) {
        const from = nodes[yarn.path[i - 1]];
        const to = nodes[yarn.path[i]];
        if (!from || !to) continue;

        if (pointSegmentDistance(x, y, from.x, from.y, to.x, to.y) < 12) {
          onPickYarn(yarn.id);
          return;
        }
      }
    }
  };

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white p-2 ${invalidMoveFlash ? "border-rose-400" : "border-slate-200"}`}>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        className="h-auto w-full touch-none rounded-xl bg-slate-50"
      />
    </div>
  );
}

export const Board = memo(BoardComponent);
