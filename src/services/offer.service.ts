import { apiGet, apiPost } from "./apiClient";

type OfferApiRecord = {
  id?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  description?: string;
  bonusCode?: string;
  isCodeRequired?: boolean;
  offerOn?: number;
  offerType?: number;
  value?: number;
  offerUsedBudget?: number;
  offerUserUsed?: number;
  turnover?: number;
  withdrawalTurnover?: number;
  splitBonus?: number;
  bonusExpiredDay?: number;
  depositVariations?: Array<{
    min?: number;
    max?: number;
    percentage?: string | number;
  }>;
  displayOrder?: number;
  offerUserLimit?: number;
  offerBudget?: number;
  minDeposit?: number;
  maxDeposit?: number;
};

type OfferApiEnvelope = {
  success?: boolean;
  messages?: Array<{ text?: string } | string>;
  data?: {
    result?: OfferApiRecord[];
    pageIndex?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
};

export type AgentOffer = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  description: string;
  bonusCode: string;
  isCodeRequired: boolean;
  offerOn: number;
  offerType: number;
  value: number;
  offerUsedBudget: number;
  offerUserUsed: number;
  turnover: number;
  withdrawalTurnover: number;
  splitBonus: number;
  bonusExpiredDay: number;
  depositVariations: Array<{
    min: number;
    max: number;
    percentage: string;
  }>;
  displayOrder: number;
  offerUserLimit: number;
  offerBudget: number;
  minDeposit: number;
  maxDeposit: number;
};

export type UpsertAgentOfferPayload = {
  id?: string;
  startDate: string;
  endDate: string;
  title: string;
  description: string;
  bonusCode?: string;
  isCodeRequired?: boolean;
  offerOn: string;
  offerType: string;
  value: number;
  offerUsedBudget?: number;
  offerUserUsed?: number;
  turnover: number | string;
  withdrawalTurnover: number;
  splitBonus: number;
  bonusExpiredDay: number;
  depositVariations: Array<{
    min: number;
    max: number;
    percentage: string;
  }>;
  displayOrder: string;
  offerUserLimit: string;
  offerBudget: number;
  minDeposit: number;
  maxDeposit: number;
};

export type AgentOfferList = {
  data: AgentOffer[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toErrorMessage(messages: OfferApiEnvelope["messages"]): string {
  if (!Array.isArray(messages) || messages.length === 0) return "Failed to load offers.";
  return messages
    .map((m) => (typeof m === "string" ? m : String(m?.text ?? "")))
    .filter(Boolean)
    .join(", ");
}

export async function getAgentOffers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<AgentOfferList> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const raw = await apiPost<OfferApiEnvelope>("/offer/getagentoffers", {
    params: {
      page,
      pageSize,
      groupBy: "",
      orderBy: "",
      orderByDesc: false,
    },
  });

  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }

  const list = Array.isArray(raw?.data?.result) ? raw.data.result : [];
  return {
    data: list.map((item, idx) => ({
      id: String(item.id ?? `offer-${idx + 1}`),
      startDate: String(item.startDate ?? ""),
      endDate: String(item.endDate ?? ""),
      title: String(item.title ?? "-"),
      description: String(item.description ?? ""),
      bonusCode: String(item.bonusCode ?? ""),
      isCodeRequired: Boolean(item.isCodeRequired),
      offerOn: Number(item.offerOn ?? 0),
      offerType: Number(item.offerType ?? 0),
      value: Number(item.value ?? 0),
      offerUsedBudget: Number(item.offerUsedBudget ?? 0),
      offerUserUsed: Number(item.offerUserUsed ?? 0),
      turnover: Number(item.turnover ?? 0),
      withdrawalTurnover: Number(item.withdrawalTurnover ?? 0),
      splitBonus: Number(item.splitBonus ?? 0),
      bonusExpiredDay: Number(item.bonusExpiredDay ?? 0),
      depositVariations: Array.isArray(item.depositVariations)
        ? item.depositVariations.map((v) => ({
            min: Number(v.min ?? 0),
            max: Number(v.max ?? 0),
            percentage: String(v.percentage ?? "0"),
          }))
        : [],
      displayOrder: Number(item.displayOrder ?? 0),
      offerUserLimit: Number(item.offerUserLimit ?? 0),
      offerBudget: Number(item.offerBudget ?? 0),
      minDeposit: Number(item.minDeposit ?? 0),
      maxDeposit: Number(item.maxDeposit ?? 0),
    })),
    page: Number(raw?.data?.pageIndex ?? page) || page,
    pageSize: Number(raw?.data?.pageSize ?? pageSize) || pageSize,
    total: Number(raw?.data?.total ?? list.length) || 0,
    totalPages: Number(raw?.data?.totalPages ?? 1) || 1,
  };
}

export async function updateAgentOffer(payload: UpsertAgentOfferPayload): Promise<boolean> {
  const raw = await apiPost<OfferApiEnvelope>("/offer/updateagentoffer", payload);
  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }
  return true;
}

export async function addAgentOffer(payload: UpsertAgentOfferPayload): Promise<boolean> {
  const raw = await apiPost<OfferApiEnvelope>("/offer/addagentoffer", payload);
  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }
  return true;
}

export async function deleteAgentOffer(id: string): Promise<boolean> {
  const offerId = String(id || "").trim();
  if (!offerId) {
    throw new Error("Offer id is required.");
  }

  const raw = await apiGet<OfferApiEnvelope>(
    `/offer/deleteagentoffer/${encodeURIComponent(offerId)}`,
  );
  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }
  return true;
}

