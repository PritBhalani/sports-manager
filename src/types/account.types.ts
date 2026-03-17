/** Balance – GET /account/getbalance, getbalancedetail/{userId} (README §2) */
export type BalanceResponse = {
  /** Legacy fields used in some endpoints */
  balance?: number;
  chips?: number;
  cash?: number;
  coins?: number;
  /** New DrPapaya balance payload (README example) */
  exposure?: number;
  balanceUp?: number;
  balanceDown?: number;
  take?: number;
  give?: number;
  creditLimit?: number;
  givenCredit?: number;
  availableCredit?: number;
  [key: string]: unknown;
};

/** Transfer list – POST /account/transfer body.searchQuery */
export type TransferSearchQuery = {
  userId?: string;
};

/** Single transfer row from POST /account/transfer */
export type TransferRecord = {
  id?: string;
  userId?: string;
  userCode?: string;
  username?: string;
  chips?: number;
  dwType?: "D" | "W";
  type?: string;
  comment?: string;
  createdAt?: string;
  timestamp?: string;
  [key: string]: unknown;
};

/** Transfer in/out – POST /account/transferin | transferout */
export type TransferInOutBody = {
  isTransfer: true;
  chips: number;
  userId: string;
  dwType: "D" | "W";
  timestamp: string;
};

/** Deposit – POST /account/in */
export type DepositBody = {
  isTransfer: boolean;
  chips: number;
  userId: string;
  dwType: "D";
  comment?: string;
  timestamp: string;
};

/** Withdraw – POST /account/out */
export type WithdrawBody = {
  isTransfer: boolean;
  chips: number;
  userId: string;
  dwType: "W";
  comment?: string;
  timestamp: string;
};

/** POST /account/getaccountstatement, getplstatement – searchQuery + params + id (README §2) */
export type StatementSearchQuery = {
  fromDate?: string;
  toDate?: string;
};

/** POST /account/downline – README §2 Downline */
export type DownlineSearchQuery = {
  userCode?: string;
  username?: string;
  status?: string;
  userId?: string;
};
export type DownlineRecord = Record<string, unknown>;
