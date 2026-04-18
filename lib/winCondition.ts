import { countIntersections, isValidPath, type GameLevel } from "@/lib/gameLogic";

export function checkWin(level: GameLevel): boolean {
  const allValid = level.yarns.every((yarn) => isValidPath(yarn.path, level.nodes));
  if (!allValid) return false;

  return countIntersections(level) === 0;
}
