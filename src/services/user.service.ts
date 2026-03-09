import { apiGet, apiPost } from "./apiClient";
import type { MyInfo, UpdateMemberBody } from "@/types/user.types";

const USER = "/user";

/**
 * GET /user/getmyinfo/{parentId}
 * Auth: Session. Returns authenticated user info (README §3 User).
 */
export async function getMyInfo(parentId: string): Promise<MyInfo> {
  return apiGet(`${USER}/getmyinfo/${encodeURIComponent(parentId)}`);
}

/**
 * POST /user/updatemember
 * Auth: Session. Body: member fields to update (README §3 User).
 */
export async function updateMember(body: UpdateMemberBody): Promise<unknown> {
  return apiPost(`${USER}/updatemember`, body);
}

/** GET /user/getusercode/{parentId} — next user code under parent (README §3) */
export async function getNextUserCode(parentId: string): Promise<{ userCode?: string }> {
  return apiGet(`${USER}/getusercode/${encodeURIComponent(parentId)}`);
}

/** POST /user/addmember — create new member (README §3). Body: username, userCode, parentId, type, etc. */
export async function addMember(body: Record<string, unknown>): Promise<unknown> {
  return apiPost(`${USER}/addmember`, body);
}

/** GET /user/getuserbyid/{userId} — full user object (README §3) */
export async function getUserById(userId: string): Promise<Record<string, unknown>> {
  return apiGet(`${USER}/getuserbyid/${encodeURIComponent(userId)}`);
}

/** GET /user/checkusername/{username} — username availability (README §3) */
export async function checkUsername(username: string): Promise<{ available?: boolean; [key: string]: unknown }> {
  return apiGet(`${USER}/checkusername/${encodeURIComponent(username)}`);
}

/** GET /user/getreferralsetting/{userId} — referral settings (README §3) */
export async function getReferralSetting(userId: string): Promise<Record<string, unknown>> {
  return apiGet(`${USER}/getreferralsetting/${encodeURIComponent(userId)}`);
}

/** POST /user/changebettinglock — Body: userId, bettingLock (bool) (README §3) */
export async function changeBettingLock(body: {
  userId: string;
  bettingLock: boolean;
}): Promise<unknown> {
  return apiPost(`${USER}/changebettinglock`, body);
}

/** POST /user/setcommission — Body: id (userId), commissions (list), applyAll (bool) (README §3) */
export async function setCommission(body: {
  id: string;
  commissions: unknown[];
  applyAll: boolean;
}): Promise<unknown> {
  return apiPost(`${USER}/setcommission`, body);
}

/** POST /user/updatereferralsetting — Body: userId, applyAll, bonus, lockingDays, etc. (README §3) */
export async function updateReferralSetting(body: Record<string, unknown>): Promise<unknown> {
  return apiPost(`${USER}/updatereferralsetting`, body);
}
