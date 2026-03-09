export const randomId = (prefix: string): string =>
  `${prefix}${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;

export const randomNumber = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomChoice = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const randomDate = (daysBack = 30): string =>
  new Date(Date.now() - Math.random() * daysBack * 86_400_000).toISOString();

// Players

export type GeneratedPlayerStatus = "Active" | "Suspended";

export type GeneratedPlayer = {
  id: string;
  username: string;
  fullName: string;
  userCode: string;
  type: "Player" | "Agent" | "Master";
  status: GeneratedPlayerStatus;
  balance: number;
  exposure: number;
  creditLimit: number;
  createdAt: string;
  lastLoginAt: string;
};

export const generatePlayers = (count = 40): GeneratedPlayer[] =>
  Array.from({ length: count }).map((_, i) => {
    const idNum = 1000 + i;
    const username = `player_${i + 1}`;
    const fullName = `Player ${idNum}`;
    const userCode = `U${idNum}`;
    const type: GeneratedPlayer["type"] =
      i % 9 === 0 ? "Master" : i % 3 === 0 ? "Agent" : "Player";
    const status: GeneratedPlayerStatus =
      i % 7 === 0 ? "Suspended" : "Active";

    return {
      id: `P${idNum}`,
      username,
      fullName,
      userCode,
      type,
      status,
      balance: randomNumber(200, 8000),
      exposure: -randomNumber(0, 2000),
      creditLimit: randomNumber(1000, 10_000),
      createdAt: randomDate(90),
      lastLoginAt: randomDate(10),
    };
  });

// Bets

export type GeneratedBetResult = "Pending" | "Won" | "Lost" | "Void";

export type GeneratedBet = {
  id: string;
  playerId: string;
  playerUsername: string;
  sport: "Cricket" | "Football" | "Tennis";
  market: string;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  result: GeneratedBetResult;
  createdAt: string;
};

const SPORTS: GeneratedBet["sport"][] = ["Cricket", "Football", "Tennis"];

const BET_MARKETS = [
  "Match Odds",
  "Session Runs",
  "Over/Under Goals",
  "Match Winner",
  "Set Handicap",
];

const BET_SELECTIONS = [
  "Team A",
  "Team B",
  "Draw",
  "Over 2.5",
  "Under 2.5",
  "Player 1",
  "Player 2",
];

export const generateBets = (
  players: GeneratedPlayer[],
  count = 80,
): GeneratedBet[] =>
  Array.from({ length: count }).map((_, i) => {
    const player = randomChoice(players);
    const sport = randomChoice(SPORTS);
    const market = `${sport} ${randomChoice(BET_MARKETS)}`;
    const selection = randomChoice(BET_SELECTIONS);
    const stake = randomNumber(100, 5000);
    const odds = Number((1.2 + Math.random() * 2.5).toFixed(2));
    const potentialPayout = Number((stake * odds).toFixed(2));
    const results: GeneratedBetResult[] = ["Pending", "Won", "Lost", "Void"];
    const result = randomChoice(results);

    return {
      id: `B${1000 + i}`,
      playerId: player.id,
      playerUsername: player.username,
      sport,
      market,
      selection,
      odds,
      stake,
      potentialPayout,
      result,
      createdAt: randomDate(30),
    };
  });

// Markets

export type GeneratedMarketStatus = "Open" | "In-Play" | "Settled" | "Suspended";

export type GeneratedMarket = {
  id: string;
  eventId: string;
  sport: "Cricket" | "Football" | "Tennis";
  eventName: string;
  marketName: string;
  status: GeneratedMarketStatus;
  totalMatched: number;
  totalBets: number;
  startTime: string;
};

const EVENTS = [
  "India vs Australia",
  "Liverpool vs Chelsea",
  "Federer vs Nadal",
  "Pakistan vs England",
  "Barcelona vs Real Madrid",
  "Djokovic vs Alcaraz",
];

const MARKET_NAMES = [
  "Match Odds",
  "Session Runs",
  "Over/Under Goals",
  "Match Winner",
  "Set Handicap",
];

export const generateMarkets = (count = 30): GeneratedMarket[] =>
  Array.from({ length: count }).map((_, i) => {
    const sport = randomChoice(SPORTS);
    const status: GeneratedMarketStatus = randomChoice([
      "Open",
      "In-Play",
      "Settled",
      "Suspended",
    ]);

    return {
      id: `M${2000 + i}`,
      eventId: `E${1500 + i}`,
      sport,
      eventName: randomChoice(EVENTS),
      marketName: randomChoice(MARKET_NAMES),
      status,
      totalMatched: randomNumber(50_000, 500_000),
      totalBets: randomNumber(50, 500),
      startTime: randomDate(7),
    };
  });

// Account Transactions

export type GeneratedTransactionType = "Deposit" | "Withdraw" | "Transfer";

export type GeneratedTransactionStatus = "Completed" | "Pending" | "Rejected";

export type GeneratedTransaction = {
  id: string;
  userId: string;
  username: string;
  type: GeneratedTransactionType;
  amount: number;
  balanceAfter: number;
  status: GeneratedTransactionStatus;
  createdAt: string;
};

export const generateTransactions = (
  players: GeneratedPlayer[],
  count = 60,
): GeneratedTransaction[] =>
  Array.from({ length: count }).map((_, i) => {
    const player = randomChoice(players);
    const type = randomChoice<GeneratedTransactionType>([
      "Deposit",
      "Withdraw",
      "Transfer",
    ]);
    const status = randomChoice<GeneratedTransactionStatus>([
      "Completed",
      "Pending",
      "Rejected",
    ]);
    const amount = randomNumber(100, 5000);
    const balanceAfter = player.balance + (type === "Withdraw" ? -amount : amount);

    return {
      id: `T${3000 + i}`,
      userId: player.id,
      username: player.username,
      type,
      amount,
      balanceAfter,
      status,
      createdAt: randomDate(30),
    };
  });

// Activity

export type GeneratedActivityModule = "Players" | "Markets" | "Bets" | "Accounts";

export type GeneratedActivityType =
  | "Login"
  | "Bet Placed"
  | "Balance Update"
  | "Security Change";

export type GeneratedActivity = {
  id: string;
  username: string;
  eventType: GeneratedActivityType;
  module: GeneratedActivityModule;
  ipAddress: string;
  device: string;
  createdAt: string;
};

const DEVICES = ["Chrome on Windows", "Safari on iOS", "Edge on Windows", "Android App"];

export const generateActivity = (
  players: GeneratedPlayer[],
  count = 80,
): GeneratedActivity[] =>
  Array.from({ length: count }).map((_, i) => {
    const player = randomChoice(players);
    const eventType = randomChoice<GeneratedActivityType>([
      "Login",
      "Bet Placed",
      "Balance Update",
      "Security Change",
    ]);
    const module = randomChoice<GeneratedActivityModule>([
      "Players",
      "Markets",
      "Bets",
      "Accounts",
    ]);

    return {
      id: `A${4000 + i}`,
      username: player.username,
      eventType,
      module,
      ipAddress: `192.168.1.${randomNumber(10, 250)}`,
      device: randomChoice(DEVICES),
      createdAt: randomDate(14),
    };
  });

// Generated datasets for the dashboard

export const mockPlayers: GeneratedPlayer[] = generatePlayers(40);
export const mockBets: GeneratedBet[] = generateBets(mockPlayers, 80);
export const mockMarkets: GeneratedMarket[] = generateMarkets(30);
export const mockTransactions: GeneratedTransaction[] = generateTransactions(
  mockPlayers,
  60,
);
export const mockActivity: GeneratedActivity[] = generateActivity(mockPlayers, 80);

