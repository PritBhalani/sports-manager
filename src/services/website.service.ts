import { apiGet, apiPost } from "./apiClient";

type BannerApiRecord = {
  id?: string;
  isActive?: boolean;
  imageContent?: string;
  isMobile?: boolean;
};

type BannerApiEnvelope = {
  success?: boolean;
  messages?: Array<{ text?: string } | string>;
  data?: {
    result?: BannerApiRecord[];
    pageIndex?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
};

export type AgentBanner = {
  id: string;
  isActive: boolean;
  imageContent: string;
  isMobile: boolean;
};

export type AgentBannerList = {
  data: AgentBanner[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toErrorMessage(messages: BannerApiEnvelope["messages"]): string {
  if (!Array.isArray(messages) || messages.length === 0) return "Failed to load banners.";
  return messages
    .map((m) => (typeof m === "string" ? m : String(m?.text ?? "")))
    .filter(Boolean)
    .join(", ");
}

export async function getAgentBannerList(params?: {
  page?: number;
  pageSize?: number;
}): Promise<AgentBannerList> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const raw = await apiPost<BannerApiEnvelope>("/website/getagentbanner", {
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
    data: list.map((row, idx) => ({
      id: String(row.id ?? `banner-${idx + 1}`),
      isActive: Boolean(row.isActive),
      imageContent: String(row.imageContent ?? ""),
      isMobile: Boolean(row.isMobile),
    })),
    page: Number(raw?.data?.pageIndex ?? page) || page,
    pageSize: Number(raw?.data?.pageSize ?? pageSize) || pageSize,
    total: Number(raw?.data?.total ?? list.length) || 0,
    totalPages: Number(raw?.data?.totalPages ?? 1) || 1,
  };
}

export async function changeActiveAgentBanner(
  id: string,
  isActive: boolean,
): Promise<boolean> {
  const bannerId = String(id || "").trim();
  if (!bannerId) {
    throw new Error("Banner id is required.");
  }

  const raw = await apiGet<BannerApiEnvelope>(
    `/website/changeactiveagentbanner/${encodeURIComponent(bannerId)}/${isActive}`,
  );

  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }

  return Boolean(raw?.data);
}

export async function deleteAgentBanner(id: string): Promise<boolean> {
  const bannerId = String(id || "").trim();
  if (!bannerId) {
    throw new Error("Banner id is required.");
  }

  const raw = await apiGet<BannerApiEnvelope>(
    `/website/deleteagentbanner/${encodeURIComponent(bannerId)}`,
  );

  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }

  return Boolean(raw?.data ?? true);
}

export async function addAgentBanner(payload: {
  isMobile: boolean;
  imageContent: string;
  isActive: boolean;
}): Promise<boolean> {
  const imageContent = String(payload.imageContent ?? "").trim();
  if (!imageContent) {
    throw new Error("Banner image is required.");
  }

  const raw = await apiPost<BannerApiEnvelope>("/website/addagentbanner", {
    isMobile: Boolean(payload.isMobile),
    imageContent,
    isActive: Boolean(payload.isActive),
  });

  if (raw?.success === false) {
    throw new Error(toErrorMessage(raw.messages));
  }

  return true;
}

