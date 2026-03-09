export type MockTransaction = {
  id: string;
  module: "Players" | "Accounts" | "Bets" | "Markets" | "Security";
  type: string;
  reference: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed";
  createdAt: string;
};

const baseDate = new Date("2025-02-18T08:30:00Z").getTime();

export const mockTransactions: MockTransaction[] = Array.from({ length: 28 }).map((_, index) => {
  const idNum = 6001 + index;

  const modules: MockTransaction["module"][] = ["Players", "Accounts", "Bets", "Markets", "Security"];
  const module = modules[index % modules.length];

  const type =
    module === "Players"
      ? index % 2 === 0
        ? "Player Created"
        : "Player Updated"
      : module === "Accounts"
      ? index % 2 === 0
        ? "Balance Updated"
        : "Transfer"
      : module === "Bets"
      ? index % 2 === 0
        ? "Bet Placed"
        : "Bet Settled"
      : module === "Markets"
      ? index % 2 === 0
        ? "Market Created"
        : "Market Settled"
      : index % 2 === 0
      ? "Login"
      : "Token Revoked";

  const reference = `${module.substring(0, 3).toUpperCase()}-${idNum}`;

  const amount =
    module === "Bets" || module === "Accounts"
      ? 100 + (index % 8) * 75
      : module === "Markets"
      ? 500 + (index % 6) * 200
      : 0;

  const status: MockTransaction["status"] =
    index % 11 === 0 ? "Failed" : index % 4 === 0 ? "Pending" : "Completed";

  const createdAt = new Date(baseDate + index * 2 * 60 * 60 * 1000).toISOString();

  return {
    id: `X${idNum}`,
    module,
    type,
    reference,
    amount,
    status,
    createdAt,
  };
});

