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

function shuffle<T>(array: T[]): T[] {
  const next = [...array];

  for (let i = next.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [next[i], next[randomIndex]] = [next[randomIndex], next[i]];
  }

  return next;
}

export function generateLevel(config: LevelConfig = {}): string[][] {
  const colorCount = config.colorCount ?? 4;
  const maxHeight = config.maxHeight ?? 4;
  const emptyColumns = config.emptyColumns ?? 2;
  const shufflePasses = config.shufflePasses ?? 6;

  const chosenColors = COLOR_POOL.slice(0, colorCount);
  const totalColumns = colorCount + emptyColumns;

  let level: string[][] = [
    ...chosenColors.map((color) => Array.from({ length: maxHeight }, () => color)),
    ...Array.from({ length: emptyColumns }, () => [] as string[]),
  ];

  for (let pass = 0; pass < shufflePasses; pass += 1) {
    const segments = shuffle(level.flat());
    const nextColumns: string[][] = Array.from({ length: totalColumns }, () => []);

    let cursor = 0;
    for (let c = 0; c < colorCount; c += 1) {
      for (let h = 0; h < maxHeight; h += 1) {
        nextColumns[c].push(segments[cursor]);
        cursor += 1;
      }
    }

    level = nextColumns;
  }

  return level;
}
