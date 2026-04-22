export const DRAGON_MAX = 14;

export type GraphNode = {
  id: string;
  x: number;
  y: number;
  connections: string[];
};

export type YarnPath = {
  id: string;
  color: string;
  start: string;
  end: string;
  path: string[];
};

export type GameLevel = {
  nodes: Record<string, GraphNode>;
  yarns: YarnPath[];
};

export function isValidPath(path: string[], nodes: Record<string, GraphNode>): boolean {
  if (path.length < 2) return false;

  for (let i = 1; i < path.length; i += 1) {
    const prev = nodes[path[i - 1]];
    if (!prev || !prev.connections.includes(path[i])) {
      return false;
    }
  }

  return true;
}

export function shortestPath(nodes: Record<string, GraphNode>, start: string, end: string): string[] | null {
  if (!nodes[start] || !nodes[end]) return null;
  if (start === end) return [start];

  const queue: string[] = [start];
  const parent = new Map<string, string | null>([[start, null]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current === end) {
      const path: string[] = [];
      let cursor: string | null = current;

      while (cursor) {
        path.push(cursor);
        cursor = parent.get(cursor) ?? null;
      }

      return path.reverse();
    }

    for (const next of nodes[current].connections) {
      if (!parent.has(next)) {
        parent.set(next, current);
        queue.push(next);
      }
    }
  }

  return null;
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}

function segmentsIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const o1 = orientation(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y);
  const o2 = orientation(a1.x, a1.y, a2.x, a2.y, b2.x, b2.y);
  const o3 = orientation(b1.x, b1.y, b2.x, b2.y, a1.x, a1.y);
  const o4 = orientation(b1.x, b1.y, b2.x, b2.y, a2.x, a2.y);

  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function countIntersections(level: GameLevel): number {
  const segments: Array<{ yarnId: string; a: string; b: string }> = [];

  for (const yarn of level.yarns) {
    for (let i = 1; i < yarn.path.length; i += 1) {
      segments.push({ yarnId: yarn.id, a: yarn.path[i - 1], b: yarn.path[i] });
    }
  }

  let intersections = 0;

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i];
      const second = segments[j];
      if (first.yarnId === second.yarnId) continue;
      if (first.a === second.a || first.a === second.b || first.b === second.a || first.b === second.b) continue;

      const f1 = level.nodes[first.a];
      const f2 = level.nodes[first.b];
      const s1 = level.nodes[second.a];
      const s2 = level.nodes[second.b];

      if (segmentsIntersect(f1, f2, s1, s2)) intersections += 1;
    }
  }

  return intersections;
}

export function rerouteThroughNode(level: GameLevel, yarnId: string, viaNodeId: string): YarnPath[] | null {
  const yarn = level.yarns.find((item) => item.id === yarnId);
  if (!yarn) return null;

  const left = shortestPath(level.nodes, yarn.start, viaNodeId);
  const right = shortestPath(level.nodes, viaNodeId, yarn.end);

  if (!left || !right) return null;

  const merged = [...left, ...right.slice(1)];
  if (!isValidPath(merged, level.nodes)) return null;

  const next = level.yarns.map((item) => (item.id === yarnId ? { ...item, path: merged } : item));
  return next;
}
