"use client";

import { motion, AnimatePresence } from "framer-motion";

type UIOverlayProps = {
  gameStatus: "playing" | "won" | "lost";
  onReset: () => void;
  onNewLevel: () => void;
};

export default function UIOverlay({ gameStatus, onReset, onNewLevel }: UIOverlayProps) {
  return (
    <AnimatePresence>
      {gameStatus !== "playing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-slate-950/50 p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-card"
          >
            <h2 className="text-2xl font-black text-slate-900">{gameStatus === "won" ? "You Calmed the Dragon!" : "The Dragon Took Over!"}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {gameStatus === "won"
                ? "Perfect sorting! Every yarn column is now organized."
                : "Too many invalid moves made the dragon fully grown."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold" onClick={onReset}>
                Reset
              </button>
              <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={onNewLevel}>
                New Level
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
