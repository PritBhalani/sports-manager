import { apiGet, apiPost } from "./apiClient";
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
  status?: number;
  user?: {
    id?: string;
    username?: string;
    parent?: {
      username?: string;
    };
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

/** POST /account/in – deposit chips to user */
export async function deposit(body: DepositBody): Promise<unknown> {
  return apiPost(`${ACCOUNT}/in`, body);
}

/** POST /account/out – withdraw chips from user */
export async function withdraw(body: WithdrawBody): Promise<unknown> {
  return apiPost(`${ACCOUNT}/out`, body);
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
