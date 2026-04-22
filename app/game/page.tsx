"use client";

import { useEffect } from "react";
import { Board } from "@/components/Board";
import { Column } from "@/components/Column";
import Dragon from "@/components/Dragon";
import UIOverlay from "@/components/UIOverlay";
import { YarnSegment } from "@/components/YarnSegment";
import { useGameStore } from "@/store/useGameStore";

const DRAGON_TICK_EVERY_MS = 12000;
const ENABLE_DRAGON_TIMER = true;

export default function GamePage() {
  const {
    nodes,
    yarns,
    selectedYarn,
    dragonSize,
    intersections,
    gameStatus,
    invalidMoveFlash,
    selectYarn,
    rerouteYarn,
    addDragonPressure,
    resetGame,
    generateLevel,
  } = useGameStore((state) => state);

  useEffect(() => {
    if (!ENABLE_DRAGON_TIMER) return;

    const interval = setInterval(() => {
      addDragonPressure(1);
    }, DRAGON_TICK_EVERY_MS);

    return () => clearInterval(interval);
  }, [addDragonPressure]);

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[1fr_360px]">
        <section className="relative rounded-3xl bg-white p-4 shadow-card sm:p-6">
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-100 to-sky-100 p-4">
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Yarn Path Untangler</h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Tap a yarn path to select it, then tap a node to reroute through that anchor. Remove intersections to calm the dragon.
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

          <Board
            nodes={nodes}
            yarns={yarns}
            selectedYarn={selectedYarn}
            invalidMoveFlash={invalidMoveFlash}
            onPickYarn={selectYarn}
            onPickNode={rerouteYarn}
          />

          <UIOverlay gameStatus={gameStatus} onReset={resetGame} onNewLevel={generateLevel} />
        </section>

        <aside className="flex flex-col gap-4">
          <Dragon dragonSize={dragonSize} intersections={intersections} />

          <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Playable Yarn Cards</h2>
            <div className="mt-3 space-y-2">
              {yarns.map((yarn) => (
                <Column key={yarn.id} yarn={yarn} selected={selectedYarn === yarn.id} onClick={() => selectYarn(yarn.id)} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">How to Play</h2>
            <div className="mt-3 space-y-2">
              <YarnSegment color="#3b82f6" label="1) Tap a yarn line (or yarn card) to select it." />
              <YarnSegment color="#10b981" label="2) Tap an anchor node to reroute selected yarn." />
              <YarnSegment color="#ef4444" label="3) Minimize crossings before dragon tension fills." />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
