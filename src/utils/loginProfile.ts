import { getAuthSession } from "@/store/authStore";

function pickStr(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickFromBoth(
  user: Record<string, unknown> | undefined,
  loginUser: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  return pickStr(user ?? {}, keys) ?? pickStr(loginUser ?? {}, keys);
}

export function getLoginUserDisplay(): { name?: string; username?: string; phone?: string } {
  const session = getAuthSession();
  const user = session.user as Record<string, unknown> | undefined;
  const loginUser = session.loginData?.user as Record<string, unknown> | undefined;

  return {
    name: pickFromBoth(user, loginUser, ["name", "fullName"]),
    username: pickFromBoth(user, loginUser, ["username", "userCode"]),
    phone: pickFromBoth(user, loginUser, ["phone", "mobile", "mobileNo", "phoneNumber"]),
  };
}
