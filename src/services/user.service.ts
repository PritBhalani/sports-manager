import { apiGet, apiPost } from "./apiClient";
import { getAuthSession } from "@/store/authStore";
import type { MyInfo, UpdateMemberBody } from "@/types/user.types";

const USER = "/user";

function strId(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * README §3: GET /user/getmyinfo/{parentId} — path param is the **parent** id.
 * Resolve strictly from login payload: parent.id / user.parentId (and their
 * copies inside loginData). Do NOT fall back to the current user id.
 */
export function getMyInfoPathId(): string | null {
  const s = getAuthSession();
  const loginData = s.loginData as Record<string, unknown> | undefined;

  const parentFromSession = strId(s.parent?.id);
  if (parentFromSession) return parentFromSession;

  const parentIdFromUser = strId(s.user?.parentId);
  if (parentIdFromUser) return parentIdFromUser;

  if (loginData?.parent && typeof loginData.parent === "object") {
    const pid = strId((loginData.parent as { id?: string }).id);
    if (pid) return pid;
  }
  if (loginData?.user && typeof loginData.user === "object") {
    const pid = strId((loginData.user as { parentId?: string }).parentId);
    if (pid) return pid;
  }

  // No parent id available in session/login payload
  return null;
}

/** Current member id for updatemember / getuserbyid — token userId or user.id */
export function getSessionMemberId(): string | null {
  const s = getAuthSession();
  const loginData = s.loginData as Record<string, unknown> | undefined;
  return (
    strId(s.userId) ||
    strId(s.user?.id) ||
    (loginData?.user && typeof loginData.user === "object"
      ? strId((loginData.user as { id?: string }).id)
      : null)
  );
}

/**
 * Same as {@link getSessionMemberId} — use for API `userId` / `id` fields from the logged-in session.
 * Replaces placeholder `CURRENT_USER_ID` / `"me"`.
 */
export function getCurrentUserId(): string | null {
  return getSessionMemberId();
}

export type LoginProfileFields = {
  name?: string;
  username?: string;
  phone?: string;
};

function strField(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function pickDisplayNameFromUser(
  obj: Record<string, unknown> | undefined,
): string | undefined {
  if (!obj) return undefined;
  return strField(obj.name) ?? strField(obj.fullName) ?? strField(obj.displayName);
}

function pickUsernameFromUser(obj: Record<string, unknown> | undefined): string | undefined {
  if (!obj) return undefined;
  return strField(obj.username) ?? strField(obj.userName) ?? strField(obj.userCode);
}

function pickPhoneFromUser(obj: Record<string, unknown> | undefined): string | undefined {
  if (!obj) return undefined;
  return (
    strField(obj.phone) ??
    strField(obj.mobile) ??
    strField(obj.phoneNumber) ??
    strField(obj.contactNumber) ??
    strField(obj.telephone)
  );
}

/**
 * Name / username / phone from the persisted login session (`user` + `loginData.user`).
 * Use on Profile before or alongside GET /user/getmyinfo.
 */
export function getLoginProfileFromSession(): LoginProfileFields {
  const s = getAuthSession();
  const loginData = s.loginData as Record<string, unknown> | undefined;

  const fromSessionUser =
    s.user && typeof s.user === "object"
      ? (s.user as Record<string, unknown>)
      : undefined;
  const fromLoginDataUser =
    loginData?.user && typeof loginData.user === "object"
      ? (loginData.user as Record<string, unknown>)
      : undefined;

  const username =
    pickUsernameFromUser(fromSessionUser) ??
    pickUsernameFromUser(fromLoginDataUser) ??
    strField(loginData?.username);

  const phone =
    pickPhoneFromUser(fromSessionUser) ??
    pickPhoneFromUser(fromLoginDataUser) ??
    pickPhoneFromUser(
      loginData && typeof loginData === "object"
        ? (loginData as Record<string, unknown>)
        : undefined,
    );

  const name =
    pickDisplayNameFromUser(fromSessionUser) ??
    pickDisplayNameFromUser(fromLoginDataUser);

  return { name, username, phone };
}

/**
 * @deprecated Use getMyInfoPathId() — README getmyinfo path is parentId.
 * Kept for any code still importing the old name.
 */
export function getProfileParentId(): string | null {
  return getMyInfoPathId();
}

type MyInfoEnvelope = {
  success?: boolean;
  data?: MyInfo;
  messages?: string[];
  [key: string]: unknown;
};

function normalizeMyInfo(payload: unknown): MyInfo {
  if (!payload || typeof payload !== "object") return {};
  const env = payload as MyInfoEnvelope;
  if (env.success === false) {
    const msg = Array.isArray(env.messages)
      ? env.messages.filter(Boolean).join(", ")
      : "getmyinfo failed";
    throw new Error(msg || "getmyinfo failed");
  }
  if (env.data && typeof env.data === "object") return env.data as MyInfo;
  return payload as MyInfo;
}

/**
 * GET /user/getmyinfo/{parentId}
 * Auth: Session. Pass parent id from session (see getMyInfoPathId).
 */
export async function getMyInfo(parentId: string): Promise<MyInfo> {
  const id = String(parentId || "").trim();
  if (!id || id === "me") {
    throw new Error("Profile requires parent id in session. Please log in again.");
  }
  const raw = await apiGet<unknown>(
    `${USER}/getmyinfo/${encodeURIComponent(id)}`,
  );
  return normalizeMyInfo(raw);
}

/**
 * POST /user/updatemember
 * Sends member id + parentId when available so backend can scope updates.
 */
export async function updateMember(body: UpdateMemberBody): Promise<unknown> {
  const s = getAuthSession();

  // Resolve parentId explicitly to avoid union types like string | null | false
  let parentId: string | null = null;
  const fromParent = strId(s.parent?.id);
  if (fromParent) {
    parentId = fromParent;
  } else {
    const fromUser = strId(s.user?.parentId);
    if (fromUser) {
      parentId = fromUser;
    } else if (s.loginData?.user && typeof s.loginData.user === "object") {
      const fromLogin = strId(
        (s.loginData.user as { parentId?: string }).parentId,
      );
      if (fromLogin) parentId = fromLogin;
    }
  }

  const payload: UpdateMemberBody = { ...body };
  if (parentId !== null && payload.parentId == null) {
    payload.parentId = parentId;
  }
  return apiPost(`${USER}/updatemember`, payload);
}

/** GET /user/getusercode/{parentId} — next user code under parent (README §3) */
export async function getNextUserCode(parentId: string): Promise<{ userCode?: string }> {
  return apiGet(`${USER}/getusercode/${encodeURIComponent(parentId)}`);
}

/** POST /user/addmember — create new member (README §3) */
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
