"use client";

import { create } from "zustand";
import { applyMove, canMove, DRAGON_MAX } from "@/lib/gameLogic";
import { generateLevel } from "@/lib/levelGenerator";
import { checkWin } from "@/lib/winCondition";

type GameStatus = "playing" | "won" | "lost";

type GameState = {
  columns: string[][];
  selectedColumn: number | null;
  maxHeight: number;
  dragonSize: number;
  gameStatus: GameStatus;
  invalidTarget: number | null;
  selectColumn: (index: number) => void;
  moveYarn: (from: number, to: number) => void;
  resetGame: () => void;
  generateLevel: () => void;
};

const MAX_HEIGHT = 4;

const buildInitialColumns = () => generateLevel({ colorCount: 4, maxHeight: MAX_HEIGHT, emptyColumns: 2 });

export const useGameStore = create<GameState>((set, get) => ({
  columns: buildInitialColumns(),
  selectedColumn: null,
  maxHeight: MAX_HEIGHT,
  dragonSize: 0,
  gameStatus: "playing",
  invalidTarget: null,

  selectColumn: (index) => {
    const { selectedColumn, gameStatus } = get();
    if (gameStatus !== "playing") return;

    if (selectedColumn === null) {
      set({ selectedColumn: index, invalidTarget: null });
      return;
    }

    if (selectedColumn === index) {
      set({ selectedColumn: null, invalidTarget: null });
      return;
    }

    get().moveYarn(selectedColumn, index);
  },

  moveYarn: (from, to) => {
    const { columns, maxHeight, dragonSize, gameStatus } = get();
    if (gameStatus !== "playing") return;

    if (!canMove(columns, from, to, maxHeight)) {
      const nextDragonSize = dragonSize + 1;
      set({
        dragonSize: nextDragonSize,
        selectedColumn: null,
        invalidTarget: to,
        gameStatus: nextDragonSize >= DRAGON_MAX ? "lost" : "playing",
      });
      return;
    }

    const nextColumns = applyMove(columns, from, to);
    const won = checkWin(nextColumns);

    set({
      columns: nextColumns,
      selectedColumn: null,
      invalidTarget: null,
      gameStatus: won ? "won" : "playing",
      dragonSize: won ? 0 : dragonSize,
    });
  },

  resetGame: () =>
    set((state) => ({
      columns: buildInitialColumns(),
      selectedColumn: null,
      dragonSize: 0,
      gameStatus: "playing",
      maxHeight: state.maxHeight,
      invalidTarget: null,
    })),

  generateLevel: () =>
    set((state) => ({
      columns: generateLevel({ colorCount: 4, maxHeight: state.maxHeight, emptyColumns: 2 }),
      selectedColumn: null,
      dragonSize: 0,
      gameStatus: "playing",
      invalidTarget: null,
    })),
}));
