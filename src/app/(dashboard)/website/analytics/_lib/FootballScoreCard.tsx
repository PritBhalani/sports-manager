"use client";

import { FootballScore } from "./websitePriceBook";
import { Clock } from "lucide-react";

type Props = {
  score: FootballScore;
};

// Custom Soccer Ball SVG for high-fidelity look
const SoccerBallIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white stroke-black/20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1" />
    <path d="M12 12L12 7M12 12L7.5 14.5M12 12L16.5 14.5" stroke="black" strokeWidth="0.5" />
    <path d="M12 7L15 5M12 7L9 5M7.5 14.5L5 13M7.5 14.5L8 18M16.5 14.5L19 13M16.5 14.5L16 18" stroke="black" strokeWidth="0.5" />
    <circle cx="12" cy="12" r="2" fill="black" />
  </svg>
);

export function FootballScoreCard({ score }: Props) {
  const { home, away, timeElapsed, updateDetails = [] } = score;

  const homeScore = Number(home.score ?? 0);
  const awayScore = Number(away.score ?? 0);

  const renderEvents = (minStart: number, minEnd: number) => {
    const periodEvents = updateDetails.filter(
      (d) => d.matchTime >= minStart && d.matchTime <= minEnd
    );

    return periodEvents.map((event, idx) => {
      const position = ((event.matchTime - minStart) / (minEnd - minStart)) * 100;
      const isGoal = event.type === "Goal";
      const isCard = event.type === "YellowCard" || event.type === "RedCard";
      
      return (
        <div
          key={`${event.type}-${event.matchTime}-${idx}`}
          className="group absolute -translate-x-1/2 cursor-default"
          style={{ 
            left: `${position}%`,
            bottom: isGoal ? "-24px" : "auto",
            top: isCard ? "-24px" : "auto"
          }}
        >
          {/* The Marker */}
          {isGoal ? (
            <SoccerBallIcon />
          ) : (
            <div
              className={`h-5 w-3.5 rounded-[1px] shadow-md ${
                event.type === "RedCard" ? "bg-red-500" : "bg-[#facc15]"
              }`}
            />
          )}

          {/* Hover Tooltip */}
          <div className={`invisible absolute left-1/2 z-10 flex min-w-[70px] -translate-x-1/2 flex-col items-center rounded bg-black/95 px-3 py-2 text-center text-[11px] font-bold text-white shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100 opacity-0 ${
            isGoal 
              ? "top-full mt-2 translate-y-1 group-hover:translate-y-0" 
              : "bottom-full mb-2 -translate-y-1 group-hover:translate-y-0"
          }`}>
            <span className="whitespace-nowrap leading-tight">{event.matchTime}&apos;</span>
            <span className="whitespace-nowrap leading-tight text-white/70 mt-0.5">{event.teamName || (event.team === "home" ? home.name : away.name)}</span>
            
            {/* Tooltip arrow */}
            <div className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-black/95 ${
              isGoal ? "-top-1" : "-bottom-1"
            }`} />
          </div>
        </div>
      );
    });
  };

  return (
    <section
      className="relative mb-4 rounded-md bg-[#2a2b16] p-6 pb-12 text-white shadow-xl border border-white/5 overflow-visible"
      aria-label="Football Scorecard"
    >
      <div className="flex flex-col gap-12">
        {/* Top section: Match header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-[24px] font-bold tracking-tight">
            <span className="text-white/90">{home.name}</span>
            <div className="flex items-center gap-2 px-1">
              <span className="text-[#39ff14] tabular-nums">{homeScore}</span>
              <span className="text-[#39ff14]/40 text-xl font-light">-</span>
              <span className="text-[#39ff14] tabular-nums">{awayScore}</span>
            </div>
            <span className="text-white/90">{away.name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[#39ff14] font-bold text-sm">
            <Clock className="h-4 w-4" strokeWidth={3} />
            <span className="tabular-nums tracking-wider">{timeElapsed ?? 0}&apos;</span>
          </div>
        </div>

        {/* Bottom section: Match Timeline */}
        <div className="relative flex w-full gap-10 px-2 pb-10">
          {/* First Half (0-45) */}
          <div className="relative h-[4px] flex-1 bg-white/5 rounded-full">
            {/* Progress fill */}
            <div 
              className="h-full bg-[#166534] rounded-full transition-all duration-1000" 
              style={{ width: `${Math.min(100, ((timeElapsed ?? 0) / 45) * 100)}%` }}
            />
            {/* Markers */}
            {renderEvents(0, 45)}
          </div>

          {/* Second Half (45-90) */}
          <div className="relative h-[4px] flex-1 bg-white/5 rounded-full">
            {/* Progress fill */}
            <div 
              className="h-full bg-[#166534] rounded-full transition-all duration-1000" 
              style={{ width: `${Math.max(0, Math.min(100, (((timeElapsed ?? 0) - 45) / 45) * 100))}%` }}
            />
            {/* Markers */}
            {renderEvents(46, 90)}
          </div>
        </div>
      </div>
    </section>
  );
}
