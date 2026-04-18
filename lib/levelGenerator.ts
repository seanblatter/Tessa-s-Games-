import type { GameLevel, GraphNode, YarnPath } from "@/lib/gameLogic";

const BASE_NODES: GraphNode[] = [
  { id: "A", x: 80, y: 80, connections: ["B", "D", "E"] },
  { id: "B", x: 220, y: 80, connections: ["A", "C", "E"] },
  { id: "C", x: 360, y: 80, connections: ["B", "F", "E"] },
  { id: "D", x: 80, y: 220, connections: ["A", "E", "G"] },
  { id: "E", x: 220, y: 220, connections: ["A", "B", "C", "D", "F", "G", "H", "I"] },
  { id: "F", x: 360, y: 220, connections: ["C", "E", "I"] },
  { id: "G", x: 80, y: 360, connections: ["D", "E", "H"] },
  { id: "H", x: 220, y: 360, connections: ["G", "E", "I"] },
  { id: "I", x: 360, y: 360, connections: ["F", "H", "E"] },
];

const BASE_YARNS: YarnPath[] = [
  { id: "red", color: "#ef4444", start: "A", end: "I", path: ["A", "E", "I"] },
  { id: "blue", color: "#3b82f6", start: "C", end: "G", path: ["C", "E", "G"] },
  { id: "green", color: "#22c55e", start: "B", end: "H", path: ["B", "E", "H"] },
];

const TANGLED_VARIANTS: string[][][] = [
  [
    ["A", "B", "E", "F", "I"],
    ["C", "B", "E", "D", "G"],
    ["B", "A", "E", "I", "H"],
  ],
  [
    ["A", "D", "E", "C", "F", "I"],
    ["C", "F", "E", "A", "D", "G"],
    ["B", "E", "I", "H"],
  ],
];

function pickVariant(): string[][] {
  return TANGLED_VARIANTS[Math.floor(Math.random() * TANGLED_VARIANTS.length)];
}

export function generateLevel(): GameLevel {
  const nodes = Object.fromEntries(BASE_NODES.map((node) => [node.id, { ...node }])) as Record<string, GraphNode>;
  const variant = pickVariant();

  const yarns = BASE_YARNS.map((yarn, index) => ({
    ...yarn,
    path: [...variant[index]],
  }));

  return { nodes, yarns };
}
