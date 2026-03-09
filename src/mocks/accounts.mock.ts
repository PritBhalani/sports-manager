export type MockAccountTransactionType = "Deposit" | "Withdraw" | "TransferIn" | "TransferOut";

export type MockAccountTransactionStatus = "Completed" | "Pending" | "Rejected";

export type MockAccountTransaction = {
  id: string;
  referenceId: string;
  userId: string;
  userCode: string;
  username: string;
  type: MockAccountTransactionType;
  amount: number;
  balanceAfter: number;
  channel: "Web" | "Mobile" | "API";
  createdAt: string;
  status: MockAccountTransactionStatus;
};

const baseDate = new Date("2025-02-05T09:15:00Z").getTime();

export const mockAccountTransactions: MockAccountTransaction[] = Array.from({ length: 30 }).map((_, index) => {
  const idNum = 2001 + index;
  const created = new Date(baseDate + index * 5 * 60 * 60 * 1000);

  const types: MockAccountTransactionType[] = ["Deposit", "Withdraw", "TransferIn", "TransferOut"];
  const type = types[index % types.length];

  const status: MockAccountTransactionStatus =
    index % 13 === 0 ? "Rejected" : index % 5 === 0 ? "Pending" : "Completed";

  const amount = 100 + (index % 7) * 150;
  const balanceAfter = 1000 + index * 80 + (index % 4) * 50;

  const channel: "Web" | "Mobile" | "API" = index % 4 === 0 ? "API" : index % 2 === 0 ? "Mobile" : "Web";

  const userId = `U${1000 + (index % 12)}`;
  const userCode = `AC${1000 + (index % 12)}`;
  const username = `user_${1000 + (index % 12)}`;

  return {
    id: `T${idNum}`,
    referenceId: `REF${idNum}`,
    userId,
    userCode,
    username,
    type,
    amount,
    balanceAfter,
    channel,
    createdAt: created.toISOString(),
    status,
  };
});

