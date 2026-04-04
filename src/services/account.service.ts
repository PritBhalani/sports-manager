import { apiGet, apiPost, type ApiMutationOptions } from "./apiClient";
import type { ListParams, ApiListResponse } from "@/types/api.types";
import type {
  BalanceResponse,
  TransferSearchQuery,
  TransferRecord,
  TransferInOutBody,
  DepositBody,
  WithdrawBody,
  StatementSearchQuery,
  DownlineSearchQuery,
  DownlineRecord,
} from "@/types/account.types";

const ACCOUNT = "/account";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  messages?: unknown;
  [key: string]: unknown;
};

type PagedResult<T> = {
  result?: T[];
  pageIndex?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  [key: string]: unknown;
};

function normalizeList<T>(raw: unknown): ApiListResponse<T> {
  // Supports both:
  // - { data: T[], total, page, pageSize }
  // - { success, data: { result: T[], pageIndex, pageSize, total, ... } }
  if (!raw || typeof raw !== "object") return { data: [] };

  const direct = raw as ApiListResponse<T>;
  if (Array.isArray(direct.data)) {
    return {
      data: direct.data,
      total: typeof direct.total === "number" ? direct.total : undefined,
      page: typeof direct.page === "number" ? direct.page : undefined,
      pageSize: typeof direct.pageSize === "number" ? direct.pageSize : undefined,
    };
  }

  const env = raw as ApiEnvelope<PagedResult<T> | T[]>;
  if (Array.isArray(env.data)) {
    return { data: env.data };
  }
  const paged = env.data as PagedResult<T> | undefined;
  const list = Array.isArray(paged?.result) ? paged?.result : [];
  return {
    data: list,
    total: typeof paged?.total === "number" ? paged.total : undefined,
    page: typeof paged?.pageIndex === "number" ? paged.pageIndex : undefined,
    pageSize: typeof paged?.pageSize === "number" ? paged.pageSize : undefined,
  };
}

export type OffPayInSearchQuery = {
  status: string;
  fromDate: string;
  toDate: string;
  userId: string;
};

export type OffPayInRecord = {
  id: string;
  amount: number;
  bonusAmount?: number;
  acNo?: string;
  detailType?: number;
  utrNo?: string;
  createdOn?: string;
  updatedOn?: string;
  comment?: string;
  /** Deposit / pay-in request workflow status (not the same as `user.status`). */
  status?: number;
  user?: {
    id?: string;
    username?: string;
    /** Member account status from the user service — not the pay-in row state. */
    status?: number;
    mobile?: string;
    parent?: {
      username?: string;
    };
    [key: string]: unknown;
  };
};

type BalanceEnvelope = {
  success?: boolean;
  data?: BalanceResponse;
  messages?: unknown;
  [key: string]: unknown;
};

function readEnvelopeErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Request failed.";
  const p = payload as { messages?: unknown; message?: unknown };
  if (Array.isArray(p.messages) && p.messages.length > 0) {
    const joined = p.messages
      .map((m) => {
        if (typeof m === "string") return m;
        if (m && typeof m === "object" && "text" in m) {
          const t = (m as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
    if (joined) return joined;
  }
  if (typeof p.message === "string" && p.message.trim()) return p.message;
  return "Request failed.";
}

/** GET /account/getbalance – balance for authenticated user */
export async function getBalance(): Promise<BalanceResponse> {
  const raw = await apiGet<unknown>(`${ACCOUNT}/getbalance`);
  if (!raw || typeof raw !== "object") return ({} as BalanceResponse);
  const env = raw as BalanceEnvelope;
  if (env.data && typeof env.data === "object") {
    return env.data as BalanceResponse;
  }
  return raw as BalanceResponse;
}

/** GET /account/getbalancedetail/{userId} */
export async function getBalanceDetail(
  userId: string
): Promise<BalanceResponse> {
  return apiGet(`${ACCOUNT}/getbalancedetail/${encodeURIComponent(userId)}`);
}

/** POST /account/transfer – paginated transfer list */
export async function getTransferList(
  params: ListParams,
  searchQuery: TransferSearchQuery,
  id: string
): Promise<ApiListResponse<TransferRecord>> {
  return apiPost(`${ACCOUNT}/transfer`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id,
  });
}

/** POST /account/transferin – chips in to user */
export async function transferIn(
  body: Omit<TransferInOutBody, "dwType"> & { dwType: "D" }
): Promise<unknown> {
  return apiPost(`${ACCOUNT}/transferin`, body);
}

/** POST /account/transferout – chips out from user */
export async function transferOut(
  body: Omit<TransferInOutBody, "dwType"> & { dwType: "W" }
): Promise<unknown> {
  return apiPost(`${ACCOUNT}/transferout`, body);
}

/** POST /account/in – deposit chips to user (`dwType: "D"`) */
export async function deposit(
  body: DepositBody,
  options?: ApiMutationOptions,
): Promise<unknown> {
  return apiPost(`${ACCOUNT}/in`, body, options);
}

/** POST /account/out – withdraw chips from user (`dwType: "W"`) */
export async function withdraw(
  body: WithdrawBody,
  options?: ApiMutationOptions,
): Promise<unknown> {
  return apiPost(`${ACCOUNT}/out`, body, options);
}

/** POST /account/getaccountstatement – README §2 Statements */
export async function getAccountStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/getaccountstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** POST /account/getbonusstatement — bonus ledger for user */
export async function getBonusStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/getbonusstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** GET /account/getreferralbalance/{userId} — may return success: false with message */
export async function getReferralBalance(userId: string): Promise<unknown> {
  return apiGet<unknown>(
    `${ACCOUNT}/getreferralbalance/${encodeURIComponent(userId)}`,
  );
}

/** POST /account/getreferralstatement — referral ledger for user */
export async function getReferralStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string,
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/getreferralstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** POST /account/gettransferstatement — transfer ledger for user */
export async function getTransferStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string,
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/gettransferstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** POST /account/getplstatement – P&L statement (README §2) */
export async function getPlStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/getplstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** POST /account/downline – paginated downline list (README §2) */
export async function getDownline(
  params: ListParams,
  searchQuery: DownlineSearchQuery,
  parentId: string
): Promise<ApiListResponse<DownlineRecord>> {
  const normalizedUsername =
    (searchQuery.username ?? "").trim() || (searchQuery.userCode ?? "").trim();
  const raw = await apiPost<unknown>(`${ACCOUNT}/downline`, {
    params: {
      pageSize: 200,
      groupBy: "",
      page: 1,
      orderBy: "",
      orderByDesc: false,
      ...params,
    },
    id: parentId,
    searchQuery: {
      // API search currently resolves both username and userCode input via username.
      userCode: "",
      username: normalizedUsername,
      status: searchQuery.status ?? "",
      userId:
        searchQuery.userId === undefined ? null : searchQuery.userId,
    },
  });
  return normalizeList<DownlineRecord>(raw);
}

/** POST /account/getCreditstatement – credit statement (README §2 Statements) */
export async function getCreditStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  const raw = await apiPost<unknown>(`${ACCOUNT}/getCreditstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
  return normalizeList<Record<string, unknown>>(raw);
}

/** GET /account/getparentstatus/{userId} – parent status for user (README §2 Downline) */
export async function getParentStatus(userId: string): Promise<Record<string, unknown>> {
  return apiGet(`${ACCOUNT}/getparentstatus/${encodeURIComponent(userId)}`);
}

/** GET /account/getinoutactivity/{userId} – in/out activity (README §2) */
export async function getInOutActivity(userId: string): Promise<Record<string, unknown>[]> {
  const res = await apiGet<
    Record<string, unknown>[] | { data?: Record<string, unknown>[]; success?: boolean; messages?: unknown }
  >(
    `${ACCOUNT}/getinoutactivity/${encodeURIComponent(userId)}`
  );
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "success" in res && res.success === false) {
    throw new Error(readEnvelopeErrorMessage(res));
  }
  return res?.data ?? [];
}

/** GET /account/getcasinoactivity/{userId} – casino activity (README §2) */
export async function getCasinoActivity(userId: string): Promise<Record<string, unknown>[]> {
  const res = await apiGet<
    Record<string, unknown>[] | { data?: Record<string, unknown>[]; success?: boolean; messages?: unknown }
  >(
    `${ACCOUNT}/getcasinoactivity/${encodeURIComponent(userId)}`
  );
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "success" in res && res.success === false) {
    throw new Error(readEnvelopeErrorMessage(res));
  }
  return res?.data ?? [];
}

/**
 * POST /payment/getoffpayin
 * Deposit request list used in the "Request Deposit" page.
 */
export async function getOffPayIn(
  params: ListParams,
  searchQuery: OffPayInSearchQuery
): Promise<ApiListResponse<OffPayInRecord>> {
  const raw = await apiPost<unknown>("/payment/getoffpayin", {
    params: {
      pageSize: 50,
      groupBy: "",
      page: 1,
      orderBy: "",
      orderByDesc: false,
      ...params,
    },
    searchQuery,
  });

  return normalizeList<OffPayInRecord>(raw);
}

/**
 * POST /payment/getoffpayout
 * Withdraw request list — same body shape and row shape as payin.
 */
export async function getOffPayOut(
  params: ListParams,
  searchQuery: OffPayInSearchQuery
): Promise<ApiListResponse<OffPayInRecord>> {
  const raw = await apiPost<unknown>("/payment/getoffpayout", {
    params: {
      pageSize: 50,
      groupBy: "",
      page: 1,
      orderBy: "",
      orderByDesc: false,
      ...params,
    },
    searchQuery,
  });

  return normalizeList<OffPayInRecord>(raw);
}

/**
 * Confirm / process a pending off-pay-in request.
 * If your backend uses a different path or body, change only this function.
 */
export async function updateOffPayIn(body: { id: string }): Promise<unknown> {
  return apiPost("/payment/updateoffpayin", body, { showSuccessToast: true });
}

/**
 * Roll back an off-pay-in request.
 * If your backend uses a different path or body, change only this function.
 */
export async function rollbackOffPayIn(body: { id: string }): Promise<unknown> {
  return apiPost("/payment/rollbackoffpayin", body, { showSuccessToast: true });
}

/** Row from GET /payment/getbankdetails — `data[]` */
export type BankDetailRecord = {
  id?: string;
  acNo?: string;
  acHolder?: string;
  ifsc?: string;
  bankName?: string;
  detailType?: number | string;
  isActive?: boolean;
  whatsAppNo?: string;
  telegramNo?: string;
  whatsapp?: string;
  telegram?: string;
  [key: string]: unknown;
};

/**
 * GET /payment/getbankdetails — website banking account list (`data[]`).
 */
export async function getBankDetails(): Promise<BankDetailRecord[]> {
  const raw = await apiGet<unknown>("/payment/getbankdetails");
  if (!raw || typeof raw !== "object") return [];
  const env = raw as ApiEnvelope<unknown>;
  if (env.success === false) {
    throw new Error(readEnvelopeErrorMessage(raw));
  }
  const d = env.data;
  return Array.isArray(d) ? (d as BankDetailRecord[]) : [];
}

/**
 * GET /payment/changeactivebank/{bankId}/{true|false}
 * Toggles bank detail active flag (Yes/No in UI).
 */
export async function changeActiveBank(
  bankId: string,
  active: boolean,
): Promise<void> {
  const id = String(bankId || "").trim();
  if (!id) throw new Error("Missing bank id.");
  const path = `/payment/changeactivebank/${encodeURIComponent(id)}/${active}`;
  const raw = await apiGet<unknown>(path);
  if (!raw || typeof raw !== "object") return;
  const env = raw as ApiEnvelope<unknown>;
  if (env.success === false) {
    throw new Error(readEnvelopeErrorMessage(raw));
  }
}

/** POST /payment/addbankdetails */
export type AddBankDetailsBody = {
  detailType: string;
  acNo: string;
  acHolder?: string;
  ifsc?: string;
  bankName?: string;
  whatsAppNo?: string;
  telegramNo?: string;
};

export async function addBankDetails(body: AddBankDetailsBody): Promise<unknown> {
  return apiPost("/payment/addbankdetails", body, { showSuccessToast: true });
}

/** POST /payment/updatebankdetails */
export type UpdateBankDetailsBody = {
  id: string;
  detailType: string;
  acNo: string;
  acHolder?: string;
  ifsc?: string;
  bankName?: string;
  whatsAppNo?: string;
  telegramNo?: string;
  isActive: boolean;
};

export async function updateBankDetails(body: UpdateBankDetailsBody): Promise<unknown> {
  return apiPost("/payment/updatebankdetails", body, { showSuccessToast: true });
}

/**
 * GET /payment/deletebankdetails/{id}
 */
export async function deleteBankDetails(bankId: string): Promise<void> {
  const id = String(bankId || "").trim();
  if (!id) throw new Error("Missing bank id.");
  const raw = await apiGet<unknown>(
    `/payment/deletebankdetails/${encodeURIComponent(id)}`,
  );
  if (!raw || typeof raw !== "object") return;
  const env = raw as ApiEnvelope<unknown>;
  if (env.success === false) {
    throw new Error(readEnvelopeErrorMessage(raw));
  }
}

/** Row from POST /account/getb2csummary — `data.result[]` */
export type B2cSummaryRow = {
  id: string;
  date: string;
  userId?: string;
  agentName?: string;
  bonusCodeList?: unknown[];
  newUsers?: unknown[];
  firstDeposit?: unknown[];
  secondDeposit?: unknown[];
  thirdDeposit?: unknown[];
  deposit: number;
  depositCount: number;
  withdrawal: number;
  withdrawalCount: number;
  bonus: number;
  bonusCount: number;
  bonusRedeem: number;
  bonusActivated: number;
  bonusExpired: number;
  netDeposit: number;
};

export type GetB2cSummaryResponse = {
  items: B2cSummaryRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /account/getb2csummary — B2C summary report */
export async function getB2cSummary(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string }
): Promise<GetB2cSummaryResponse> {
  type Envelope = {
    data?: {
      result?: B2cSummaryRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${ACCOUNT}/getb2csummary`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery,
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}
