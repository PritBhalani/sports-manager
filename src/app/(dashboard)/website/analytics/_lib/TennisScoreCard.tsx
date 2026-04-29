"use client";

import { TennisScore } from "./websitePriceBook";

type Props = {
  score: TennisScore;
};

export function TennisScoreCard({ score }: Props) {
  const { home, away, currentSet, fullTimeElapsed } = score;

  // Extract completed set scores from gameSequence
  const homeSeq = home.gameSequence || [];
  const awaySeq = away.gameSequence || [];
  
  // Calculate max length to align sets
  const seqLength = Math.max(homeSeq.length, awaySeq.length);
  
  // Build the list of set columns
  const setCols: { label: string; h: string | number; a: string | number; isActive?: boolean }[] = [];
  
  // Add completed sets from sequence
  for (let i = 0; i < seqLength; i++) {
    setCols.push({
      label: String(i + 1),
      h: homeSeq[i] || "0",
      a: awaySeq[i] || "0",
      isActive: false,
    });
  }
  
  // Add the current active set column if not already in sequence
  // If currentSet is 2 and we only have 1 completed set, add Set 2.
  const activeSetNum = currentSet || (seqLength + 1);
  if (activeSetNum > seqLength) {
    setCols.push({
      label: String(activeSetNum),
      h: home.games ?? "0",
      a: away.games ?? "0",
      isActive: true,
    });
  } else {
    // If currentSet matches one of the existing sequences (unlikely with this data structure but safe)
    if (setCols[activeSetNum - 1]) {
      setCols[activeSetNum - 1].isActive = true;
      setCols[activeSetNum - 1].h = home.games ?? setCols[activeSetNum - 1].h;
      setCols[activeSetNum - 1].a = away.games ?? setCols[activeSetNum - 1].a;
    }
  }

  // Format time: "0h0"
  const timeStr = fullTimeElapsed 
    ? `${fullTimeElapsed.hour}h${fullTimeElapsed.min}` 
    : "0h0";

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl bg-[#262b26] p-6 text-white shadow-2xl"
      aria-label="Tennis Scorecard"
    >
      <div className="flex items-center justify-between">
        {/* Left Side: Players and Match Status */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-white">
                {home.name || "Home"}
              </span>
              {home.isServing && (
                <div className="h-3 w-3 rounded-full bg-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,1)]" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-white">
                {away.name || "Away"}
              </span>
              {away.isServing && (
                <div className="h-3 w-3 rounded-full bg-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,1)]" />
              )}
            </div>
          </div>
          <div className="text-[13px] font-bold text-[#39ff14] uppercase tracking-wide">
            Set {activeSetNum} | {timeStr}
          </div>
        </div>

        {/* Right Side: Sets and Point Scores */}
        <div className="flex gap-3">
          {/* Historical and Current Sets */}
          {setCols.map((col) => (
            <div key={col.label} className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-center justify-center rounded-lg bg-[#1a1e1a] px-5 py-3 min-w-[3.8rem] border border-white/5">
                <span 
                  className={`text-2xl font-bold tabular-nums leading-none ${
                    col.isActive ? "text-[#39ff14]" : "text-white/40"
                  }`}
                >
                  {col.h}
                </span>
                <div className="my-2.5 h-[1px] w-full bg-white/10" />
                <span 
                  className={`text-2xl font-bold tabular-nums leading-none ${
                    col.isActive ? "text-[#39ff14]" : "text-white/40"
                  }`}
                >
                  {col.a}
                </span>
              </div>
              <span className={`text-[12px] font-bold uppercase tracking-widest ${col.isActive ? "text-[#ff4d4d]" : "text-white/60"}`}>
                {col.label}
              </span>
            </div>
          ))}

          {/* Current Game Points */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center justify-center rounded-lg bg-[#1a1e1a] px-5 py-3 min-w-[4.2rem] border border-white/5">
              <span className="text-2xl font-bold text-[#39ff14] tabular-nums leading-none">
                {home.score ?? "0"}
              </span>
              <div className="my-2.5 h-[1px] w-full bg-white/10" />
              <span className="text-2xl font-bold text-[#39ff14] tabular-nums leading-none">
                {away.score ?? "0"}
              </span>
            </div>
            <span className="text-[12px] font-bold text-white uppercase tracking-widest">
              Point
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
