/** README §6 Token / Login History */
import { apiGet } from "./apiClient";
import type { LoginHistoryRecord } from "@/types/token.types";

/** GET /token/loginhistory – authenticated user */
export async function getLoginHistory(): Promise<LoginHistoryRecord[]> {
  const res = await apiGet<LoginHistoryRecord[] | { data?: LoginHistoryRecord[] }>(
    "/token/loginhistory"
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /token/loginhistorybyid/{userId} */
export async function getLoginHistoryById(
  userId: string
): Promise<LoginHistoryRecord[]> {
  const res = await apiGet<LoginHistoryRecord[] | { data?: LoginHistoryRecord[] }>(
    `/token/loginhistorybyid/${encodeURIComponent(userId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}
