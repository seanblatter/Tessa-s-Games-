"use client";

import { create } from "zustand";
import { checkWin } from "@/lib/winCondition";
import { countIntersections, DRAGON_MAX, rerouteThroughNode, type GameLevel, type GraphNode, type YarnPath } from "@/lib/gameLogic";
import { generateLevel } from "@/lib/levelGenerator";

type GameStatus = "playing" | "won" | "lost";

type GameState = {
  nodes: Record<string, GraphNode>;
  yarns: YarnPath[];
  selectedYarn: string | null;
  dragonSize: number;
  intersections: number;
  gameStatus: GameStatus;
  invalidMoveFlash: boolean;
  selectYarn: (id: string) => void;
  rerouteYarn: (viaNodeId: string) => void;
  addDragonPressure: (amount: number) => void;
  resetGame: () => void;
  generateLevel: () => void;
};

function createInitialState(): Pick<GameState, "nodes" | "yarns" | "intersections"> {
  const level = generateLevel();
  return {
    nodes: level.nodes,
    yarns: level.yarns,
    intersections: countIntersections(level),
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),
  selectedYarn: null,
  dragonSize: 0,
  gameStatus: "playing",
  invalidMoveFlash: false,

  selectYarn: (id) => {
    if (get().gameStatus !== "playing") return;
    set((state) => ({ selectedYarn: state.selectedYarn === id ? null : id }));
  },

  rerouteYarn: (viaNodeId) => {
    const { nodes, yarns, selectedYarn, dragonSize, gameStatus } = get();
    if (gameStatus !== "playing" || !selectedYarn) return;

    const level: GameLevel = { nodes, yarns };
    const nextYarns = rerouteThroughNode(level, selectedYarn, viaNodeId);

    if (!nextYarns) {
      const nextDragon = dragonSize + 1;
      set({
        dragonSize: nextDragon,
        selectedYarn: null,
        invalidMoveFlash: true,
        gameStatus: nextDragon >= DRAGON_MAX ? "lost" : "playing",
      });
      setTimeout(() => set({ invalidMoveFlash: false }), 220);
      return;
    }

    const nextLevel: GameLevel = { nodes, yarns: nextYarns };
    const intersections = countIntersections(nextLevel);
    const won = checkWin(nextLevel);

    set({
      yarns: nextYarns,
      selectedYarn: null,
      intersections,
      invalidMoveFlash: false,
      gameStatus: won ? "won" : "playing",
      dragonSize: won ? 0 : Math.min(dragonSize + intersections, DRAGON_MAX),
    });
  },

  addDragonPressure: (amount) =>
    set((state) => {
      if (state.gameStatus !== "playing") return state;
      const nextDragon = state.dragonSize + amount;

      return {
        dragonSize: nextDragon,
        gameStatus: nextDragon >= DRAGON_MAX ? "lost" : "playing",
      };
    }),

  resetGame: () =>
    set(() => ({
      ...createInitialState(),
      selectedYarn: null,
      dragonSize: 0,
      gameStatus: "playing",
      invalidMoveFlash: false,
    })),

  generateLevel: () =>
    set(() => ({
      ...createInitialState(),
      selectedYarn: null,
      dragonSize: 0,
      gameStatus: "playing",
      invalidMoveFlash: false,
    })),
}));
