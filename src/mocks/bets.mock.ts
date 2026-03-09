export type MockBetResult = "Pending" | "Won" | "Lost" | "Void";

export type MockBet = {
  id: string;
  playerId: string;
  playerUsername: string;
  sport: "Cricket" | "Football" | "Tennis";
  market: string;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  result: MockBetResult;
  createdAt: string;
};

const baseDate = new Date("2025-02-08T12:00:00Z").getTime();

const markets = [
  "Cricket Match Odds",
  "Cricket Session Runs",
  "Football Match Odds",
  "Football Over/Under",
  "Tennis Match Odds",
  "Tennis Set Handicap",
];

const selections = [
  "Team A",
  "Team B",
  "Draw",
  "Over 2.5",
  "Under 2.5",
  "Player 1",
  "Player 2",
  "Session Over",
  "Session Under",
];

export const mockBets: MockBet[] = Array.from({ length: 32 }).map((_, index) => {
  const idNum = 3001 + index;
  const created = new Date(baseDate + index * 90 * 60 * 1000);

  const sports: MockBet["sport"][] = ["Cricket", "Football", "Tennis"];
  const sport = sports[index % sports.length];

  const market = markets[index % markets.length];
  const selection = selections[index % selections.length];

  const stake = 100 + (index % 10) * 50;
  const odds = 1.4 + (index % 6) * 0.15;
  const potentialPayout = stake * odds;

  const results: MockBetResult[] = ["Pending", "Won", "Lost", "Void"];
  const result = results[index % results.length];

  const playerIndex = 1001 + (index % 18);
  const playerId = `P${playerIndex}`;
  const playerUsername = `player_${playerIndex}`;

  return {
    id: `B${idNum}`,
    playerId,
    playerUsername,
    sport,
    market,
    selection,
    odds: Number(odds.toFixed(2)),
    stake,
    potentialPayout: Number(potentialPayout.toFixed(2)),
    result,
    createdAt: created.toISOString(),
  };
});

