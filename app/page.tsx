import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-6">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center gap-6 rounded-3xl bg-white/80 p-8 text-center shadow-card backdrop-blur">
        <p className="rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
          Yarn Dragon Sort
        </p>
        <h1 className="text-balance text-4xl font-black text-slate-900">Sort the Yarn, Calm the Dragon</h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          Move yarn segments between containers until each column is empty or a single color. Every invalid move feeds the crocheted dragon!
        </p>
        <Link
          href="/game"
          className="rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
        >
          Play Now
        </Link>
      </div>
    </main>
  );
}
