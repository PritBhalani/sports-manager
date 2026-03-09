export type MockProfitLossRow = {
  id: string;
  userId: string;
  username: string;
  marketId: string;
  marketName: string;
  sport: "Cricket" | "Football" | "Tennis";
  totalBets: number;
  stake: number;
  profitLoss: number;
  commission: number;
  settledAt: string;
};

export type MockDownlineSummaryRow = {
  id: string;
  userId: string;
  username: string;
  role: "Player" | "Agent" | "Master";
  totalPlayers: number;
  totalBets: number;
  netExposure: number;
  profitLoss: number;
};

const baseDate = new Date("2025-02-15T11:00:00Z").getTime();

export const mockProfitLossByMarket: MockProfitLossRow[] = Array.from({ length: 26 }).map((_, index) => {
  const idNum = 5001 + index;
  const sports: MockProfitLossRow["sport"][] = ["Cricket", "Football", "Tennis"];
  const sport = sports[index % sports.length];
  const marketId = `M${4001 + (index % 20)}`;

  const marketName =
    sport === "Cricket"
      ? index % 2 === 0
        ? "Cricket Match Odds"
        : "Cricket Session Runs"
      : sport === "Football"
      ? index % 2 === 0
        ? "Football Match Odds"
        : "Football Over/Under"
      : index % 2 === 0
      ? "Tennis Match Odds"
      : "Tennis Set Handicap";

  const totalBets = 20 + (index % 8) * 5;
  const stake = 1000 + index * 150;
  const profitLossRaw = (index % 3 === 0 ? 1 : -1) * (200 + (index % 7) * 80);
  const commission = Math.round(Math.abs(profitLossRaw) * 0.02);
  const profitLoss = profitLossRaw - commission;

  const settledAt = new Date(baseDate + index * 4 * 60 * 60 * 1000).toISOString();

  const userId = `U${1000 + (index % 10)}`;
  const username = `player_${1000 + (index % 10)}`;

  return {
    id: `PL${idNum}`,
    userId,
    username,
    marketId,
    marketName,
    sport,
    totalBets,
    stake,
    profitLoss,
    commission,
    settledAt,
  };
});

export const mockDownlineSummary: MockDownlineSummaryRow[] = Array.from({ length: 22 }).map((_, index) => {
  const idNum = 5101 + index;

  const roles: MockDownlineSummaryRow["role"][] = ["Player", "Agent", "Master"];
  const role = roles[index % roles.length];

  const totalPlayers = role === "Player" ? 0 : 5 + (index % 6) * 3;
  const totalBets = 50 + (index % 10) * 12;
  const netExposure = (index % 2 === 0 ? -1 : 1) * (500 + (index % 7) * 110);
  const profitLoss = (index % 3 === 0 ? 1 : -1) * (300 + (index % 5) * 90);

  const userId = `AG${1200 + index}`;
  const username = `agent_${1200 + index}`;

  return {
    id: `DL${idNum}`,
    userId,
    username,
    role,
    totalPlayers,
    totalBets,
    netExposure,
    profitLoss,
  };
});

