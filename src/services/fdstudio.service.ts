import { apiPost } from "./apiClient";
import type { ListParams } from "@/types/api.types";

const FDSTUDIO = "/fdstudio";

export type FdProfitLossUser = {
  id?: string;
  userCode?: string;
  username?: string;
  userType?: number;
  [key: string]: unknown;
};

/** Row from POST /fdstudio/getprofitloss — `data.result[]` */
export type FdProfitLossRow = {
  user?: FdProfitLossUser;
  roundId?: string;
  tableName?: string;
  provider?: number | string;
  createdOn?: string;
  from?: string;
  to?: string;
  win: number;
};

export type GetFdProfitLossResponse = {
  items: FdProfitLossRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

export type FdProfitLossSearchQuery = {
  fromDate: string;
  toDate: string;
  /** Required for per-user round P&L (e.g. player detail). */
  userId?: string;
};

/**
 * POST /fdstudio/getprofitloss
 * Pass `id` (and usually `searchQuery.userId`) for player-scoped round list; omit for org-wide report.
 */
export async function getFdProfitLoss(
  params: ListParams,
  searchQuery: FdProfitLossSearchQuery,
  id?: string,
): Promise<GetFdProfitLossResponse> {
  type Envelope = {
    data?: {
      result?: FdProfitLossRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const mergedParams = {
    pageSize: 50,
    groupBy: "",
    page: 1,
    orderBy: "",
    orderByDesc: false,
    ...params,
  };
  const body: Record<string, unknown> = {
    searchQuery,
    params: mergedParams,
  };
  const trimmedId = id?.trim();
  if (trimmedId) {
    body.id = trimmedId;
  }

  const res = await apiPost<Envelope>(`${FDSTUDIO}/getprofitloss`, body);
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? mergedParams.page ?? 1,
    pageSize: inner?.pageSize ?? mergedParams.pageSize ?? 50,
  };
}

/** Row from POST /fdstudio/getrunningexposure — `data.result[]` */
export type FdRunningExposureRow = {
  id?: string;
  username?: string;
  name?: string;
  tableName?: string;
  roundId?: string | number;
  provider?: number | string;
  credit?: number;
  debit?: number;
  /** Legacy/alternate flag name */
  isPl?: boolean;
  isPlRequest?: boolean;
  createdOn?: string;
  [key: string]: unknown;
};

/**
 * Casino provider ids (e.g. `AllowedProvider: [5, 7]` enables Fawk + DreamCasino).
 * Aligns with backend enum; extend when new providers are added.
 */
export const CASINO_PROVIDER_LABELS: Record<number, string> = {
  1: "Fairdeal",
  2: "Supernowa",
  3: "Ezugi",
  4: "Evolution",
  5: "Fawk",
  6: "QTech",
  7: "DreamCasino",
};

export function formatFdProvider(provider: unknown): string {
  if (provider === undefined || provider === null) return "—";
  const n = Number(provider);
  if (Number.isFinite(n) && CASINO_PROVIDER_LABELS[n]) return CASINO_PROVIDER_LABELS[n]!;
  return String(provider);
}

export type GetFdRunningExposureResponse = {
  items: FdRunningExposureRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /fdstudio/getrunningexposure — running exposure list (no searchQuery) */
export async function getFdRunningExposure(
  params: ListParams,
): Promise<GetFdRunningExposureResponse> {
  type Envelope = {
    data?: {
      result?: FdRunningExposureRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${FDSTUDIO}/getrunningexposure`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}
