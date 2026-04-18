const COLOR_POOL = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

export type LevelConfig = {
  colorCount?: number;
  maxHeight?: number;
  emptyColumns?: number;
  shufflePasses?: number;
};

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function cloneColumns(columns: string[][]): string[][] {
  return columns.map((column) => [...column]);
}

function isValidMove(columns: string[][], from: number, to: number, maxHeight: number): boolean {
  if (from === to) return false;

  const source = columns[from];
  const target = columns[to];
  if (!source || !target || source.length === 0 || target.length >= maxHeight) {
    return false;
  }

  const moving = source[source.length - 1];
  const targetTop = target[target.length - 1];
  return target.length === 0 || targetTop === moving;
}

function applyMove(columns: string[][], from: number, to: number): boolean {
  const source = columns[from];
  const target = columns[to];
  const moving = source.pop();

  if (!moving) return false;

  target.push(moving);
  return true;
}

export function generateLevel(config: LevelConfig = {}): string[][] {
  const colorCount = config.colorCount ?? 4;
  const maxHeight = config.maxHeight ?? 4;
  const emptyColumns = config.emptyColumns ?? 2;
  const shufflePasses = config.shufflePasses ?? 80;

  const chosenColors = COLOR_POOL.slice(0, colorCount);
  const totalColumns = colorCount + emptyColumns;

  // Start from a solved board, then scramble using only legal moves.
  // This guarantees the generated board is reachable and therefore solvable.
  const columns: string[][] = [
    ...chosenColors.map((color) => Array.from({ length: maxHeight }, () => color)),
    ...Array.from({ length: emptyColumns }, () => [] as string[]),
  ];

  let steps = 0;
  const targetSteps = Math.max(shufflePasses, colorCount * maxHeight * 4);

  while (steps < targetSteps) {
    const from = randomInt(totalColumns);
    const to = randomInt(totalColumns);

    if (!isValidMove(columns, from, to, maxHeight)) {
      continue;
    }

    if (!applyMove(columns, from, to)) {
      continue;
    }

    steps += 1;
  }

  return cloneColumns(columns);
}
