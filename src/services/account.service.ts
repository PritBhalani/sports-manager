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

type BalanceEnvelope = {
  success?: boolean;
  data?: BalanceResponse;
  messages?: unknown;
  [key: string]: unknown;
};

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
  return apiPost(`${ACCOUNT}/getaccountstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
}

/** POST /account/getplstatement – P&L statement (README §2) */
export async function getPlStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${ACCOUNT}/getplstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
}

/** POST /account/downline – paginated downline list (README §2) */
export async function getDownline(
  params: ListParams,
  searchQuery: DownlineSearchQuery,
  parentId: string
): Promise<ApiListResponse<DownlineRecord>> {
  return apiPost(`${ACCOUNT}/downline`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: parentId,
  });
}

/** POST /account/getCreditstatement – credit statement (README §2 Statements) */
export async function getCreditStatement(
  params: ListParams,
  searchQuery: StatementSearchQuery,
  userId: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${ACCOUNT}/getCreditstatement`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    id: userId,
  });
}

/** GET /account/getparentstatus/{userId} – parent status for user (README §2 Downline) */
export async function getParentStatus(userId: string): Promise<Record<string, unknown>> {
  return apiGet(`${ACCOUNT}/getparentstatus/${encodeURIComponent(userId)}`);
}

/** GET /account/getinoutactivity/{userId} – in/out activity (README §2) */
export async function getInOutActivity(userId: string): Promise<Record<string, unknown>[]> {
  const res = await apiGet<Record<string, unknown>[] | { data?: Record<string, unknown>[] }>(
    `${ACCOUNT}/getinoutactivity/${encodeURIComponent(userId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /account/getcasinoactivity/{userId} – casino activity (README §2) */
export async function getCasinoActivity(userId: string): Promise<Record<string, unknown>[]> {
  const res = await apiGet<Record<string, unknown>[] | { data?: Record<string, unknown>[] }>(
    `${ACCOUNT}/getcasinoactivity/${encodeURIComponent(userId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}
