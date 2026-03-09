export type MockActivityType =
  | "Login"
  | "Logout"
  | "Bet Placed"
  | "Bet Settled"
  | "Balance Update"
  | "Market Created"
  | "Market Settled";

export type MockUserActivity = {
  id: string;
  userId: string;
  username: string;
  type: MockActivityType;
  module: "Players" | "Accounts" | "Bets" | "Markets" | "Security";
  description: string;
  ipAddress: string;
  device: string;
  createdAt: string;
};

const baseDate = new Date("2025-02-20T07:45:00Z").getTime();

export const mockUserActivity: MockUserActivity[] = Array.from({ length: 30 }).map((_, index) => {
  const idNum = 7001 + index;

  const modules: MockUserActivity["module"][] = ["Players", "Accounts", "Bets", "Markets", "Security"];
  const module = modules[index % modules.length];

  const types: MockActivityType[] = [
    "Login",
    "Logout",
    "Bet Placed",
    "Bet Settled",
    "Balance Update",
    "Market Created",
    "Market Settled",
  ];
  const type = types[index % types.length];

  const userId = `U${1300 + (index % 10)}`;
  const username = `user_${1300 + (index % 10)}`;

  const descriptionBase =
    type === "Login"
      ? "logged in"
      : type === "Logout"
      ? "logged out"
      : type === "Bet Placed"
      ? "placed a new bet"
      : type === "Bet Settled"
      ? "had a bet settled"
      : type === "Balance Update"
      ? "balance updated after transaction"
      : type === "Market Created"
      ? "created new market"
      : "settled a market";

  const description = `${username} ${descriptionBase} in ${module}`;

  const ipAddress = `192.168.1.${(index % 50) + 10}`;
  const device = index % 3 === 0 ? "Chrome on Windows" : index % 3 === 1 ? "Safari on iOS" : "Edge on Windows";

  const createdAt = new Date(baseDate + index * 45 * 60 * 1000).toISOString();

  return {
    id: `A${idNum}`,
    userId,
    username,
    type,
    module,
    description,
    ipAddress,
    device,
    createdAt,
  };
});

