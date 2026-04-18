export const DRAGON_MAX = 10;

export function canMove(columns: string[][], from: number, to: number, maxHeight: number): boolean {
  if (from === to) return false;

  const source = columns[from];
  const target = columns[to];

  if (!source || !target || source.length === 0 || target.length >= maxHeight) {
    return false;
  }

  const movingColor = source[source.length - 1];
  const targetTop = target[target.length - 1];

  return target.length === 0 || targetTop === movingColor;
}

export function applyMove(columns: string[][], from: number, to: number): string[][] {
  const next = columns.map((column) => [...column]);
  const moving = next[from].pop();

  if (!moving) return columns;

  next[to].push(moving);
  return next;
}
