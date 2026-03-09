export type MockMarketStatus = "Open" | "In-Play" | "Settled" | "Suspended";

export type MockMarket = {
  id: string;
  eventId: string;
  sport: "Cricket" | "Football" | "Tennis";
  eventName: string;
  marketName: string;
  status: MockMarketStatus;
  totalMatched: number;
  totalBets: number;
  startTime: string;
};

const baseDate = new Date("2025-02-12T14:30:00Z").getTime();

const eventNames = [
  "India vs Australia",
  "Liverpool vs Chelsea",
  "Federer vs Nadal",
  "Pakistan vs England",
  "Barcelona vs Real Madrid",
  "Djokovic vs Alcaraz",
];

const marketNames = [
  "Match Odds",
  "Session Runs",
  "Over/Under Goals",
  "Match Winner",
  "Set Handicap",
  "First Goal Scorer",
];

export const mockMarkets: MockMarket[] = Array.from({ length: 24 }).map((_, index) => {
  const idNum = 4001 + index;
  const startTime = new Date(baseDate + index * 3 * 60 * 60 * 1000);

  const sports: MockMarket["sport"][] = ["Cricket", "Football", "Tennis"];
  const sport = sports[index % sports.length];

  const statusOptions: MockMarketStatus[] = ["Open", "In-Play", "Settled", "Suspended"];
  const status = statusOptions[index % statusOptions.length];

  const totalMatched = 100000 + index * 25000 + (index % 5) * 10000;
  const totalBets = 150 + (index % 10) * 25;

  const eventName = eventNames[index % eventNames.length];
  const marketName = marketNames[index % marketNames.length];

  return {
    id: `M${idNum}`,
    eventId: `E${2000 + (index % 12)}`,
    sport,
    eventName,
    marketName,
    status,
    totalMatched,
    totalBets,
    startTime: startTime.toISOString(),
  };
});

