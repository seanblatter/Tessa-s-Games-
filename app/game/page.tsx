"use client";

import { useEffect } from "react";
import { Board } from "@/components/Board";
import Dragon from "@/components/Dragon";
import UIOverlay from "@/components/UIOverlay";
import { useGameStore } from "@/store/useGameStore";

const DRAGON_TICK_EVERY_MS = 15000;
const ENABLE_DRAGON_TIMER = true;

export default function GamePage() {
  const {
    columns,
    selectedColumn,
    maxHeight,
    dragonSize,
    gameStatus,
    invalidTarget,
    selectColumn,
    resetGame,
    generateLevel,
  } = useGameStore((state) => state);

  useEffect(() => {
    if (!ENABLE_DRAGON_TIMER) return;

    const interval = setInterval(() => {
      const store = useGameStore.getState();
      if (store.gameStatus !== "playing") return;

      const nextDragon = store.dragonSize + 1;
      useGameStore.setState({
        dragonSize: nextDragon,
        gameStatus: nextDragon >= 10 ? "lost" : "playing",
      });
    }, DRAGON_TICK_EVERY_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row">
        <section className="relative flex-1 rounded-3xl bg-white p-4 shadow-card sm:p-6">
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-100 to-sky-100 p-4">
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Yarn Dragon Sort</h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Tap one column to pick up top yarn, then tap a destination with matching top color or an empty column.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button onClick={resetGame} className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
              Reset
            </button>
            <button onClick={generateLevel} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
              New Level
            </button>
          </div>

          <div className="rounded-2xl bg-white p-2">
            <Board
              columns={columns}
              selectedColumn={selectedColumn}
              invalidTarget={invalidTarget}
              maxHeight={maxHeight}
              onSelectColumn={selectColumn}
            />
          </div>

          <UIOverlay gameStatus={gameStatus} onReset={resetGame} onNewLevel={generateLevel} />
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <Dragon dragonSize={dragonSize} />
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Play Card</h2>
            <button
              onClick={generateLevel}
              className="mt-3 w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 text-left transition active:scale-[0.98]"
            >
              <p className="text-base font-black text-indigo-700">🎮 Tap to Start a Fresh Puzzle</p>
              <p className="mt-1 text-xs text-indigo-600">This card is clickable so players can quickly jump into a playable level.</p>
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
