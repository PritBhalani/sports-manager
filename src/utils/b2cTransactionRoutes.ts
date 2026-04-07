/** First 10 chars `YYYY-MM-DD` for query `date`. */
export function b2cSummaryRowDateQueryParam(dateRaw: string): string {
  return String(dateRaw ?? "").trim().slice(0, 10);
}

export type B2cTransactionsQueryKind = "dw" | "bonus";

/** URL segment under `/reports/b2c-summary/transactions/:report` */
export const B2C_TX_REPORT_SLUGS = [
  "deposit",
  "withdrawal",
  "bonus-activated",
  "bonus-redeemed",
  "bonus-expired",
] as const;

export type B2cTxReportSlug = (typeof B2C_TX_REPORT_SLUGS)[number];

export function b2cTxReportSlugFromKindDw(
  kind: B2cTransactionsQueryKind,
  dwType: string,
): B2cTxReportSlug | null {
  const d = String(dwType).trim().toUpperCase();
  if (kind === "dw") {
    if (d === "D") return "deposit";
    if (d === "W") return "withdrawal";
    return null;
  }
  if (kind === "bonus") {
    if (d === "A") return "bonus-activated";
    if (d === "R") return "bonus-redeemed";
    if (d === "E") return "bonus-expired";
    return null;
  }
  return null;
}

export function b2cTxKindDwTypeFromSlug(slug: string): {
  kind: B2cTransactionsQueryKind;
  dwType: string;
} | null {
  const s = String(slug ?? "").trim().toLowerCase();
  switch (s) {
    case "deposit":
      return { kind: "dw", dwType: "D" };
    case "withdrawal":
      return { kind: "dw", dwType: "W" };
    case "bonus-activated":
      return { kind: "bonus", dwType: "A" };
    case "bonus-redeemed":
      return { kind: "bonus", dwType: "R" };
    case "bonus-expired":
      return { kind: "bonus", dwType: "E" };
    default:
      return null;
  }
}

/**
 * Drill-down target: `/reports/b2c-summary/transactions/{report}?summaryId&userId&agentName&date`
 * (kind / dwType live in the path instead of the query string.)
 */
export function buildB2cTransactionsHref(args: {
  summaryId: string;
  userId: string;
  agentName: string;
  dateRaw: string;
  kind: B2cTransactionsQueryKind;
  dwType: string;
}): string {
  const slug = b2cTxReportSlugFromKindDw(args.kind, args.dwType);
  if (!slug) {
    const q = new URLSearchParams({
      summaryId: String(args.summaryId).trim(),
      userId: String(args.userId).trim(),
      agentName: String(args.agentName).trim(),
      date: b2cSummaryRowDateQueryParam(args.dateRaw),
      kind: args.kind,
      dwType: String(args.dwType).trim(),
    });
    return `/reports/b2c-summary/transactions?${q.toString()}`;
  }
  const q = new URLSearchParams({
    summaryId: String(args.summaryId).trim(),
    userId: String(args.userId).trim(),
    agentName: String(args.agentName).trim(),
    date: b2cSummaryRowDateQueryParam(args.dateRaw),
  });
  return `/reports/b2c-summary/transactions/${slug}?${q.toString()}`;
}

/**
 * If the URL still uses legacy `kind` + `dwType` query params, returns the canonical path URL;
 * otherwise `null`.
 */
export function legacyB2cTransactionsUrlFromSearchParams(
  sp: URLSearchParams,
): string | null {
  const summaryId = sp.get("summaryId")?.trim() ?? "";
  const userId = sp.get("userId")?.trim() ?? "";
  const agentName = sp.get("agentName")?.trim() ?? "";
  const dateRaw = sp.get("date")?.trim() ?? "";
  const kind = sp.get("kind")?.trim();
  const dwType = sp.get("dwType")?.trim() ?? "";
  if (!summaryId || !userId || !agentName || !dateRaw) return null;
  if (kind !== "dw" && kind !== "bonus") return null;
  const slug = b2cTxReportSlugFromKindDw(kind, dwType);
  if (!slug) return null;
  const q = new URLSearchParams({
    summaryId,
    userId,
    agentName,
    date: b2cSummaryRowDateQueryParam(dateRaw),
  });
  return `/reports/b2c-summary/transactions/${slug}?${q.toString()}`;
}
