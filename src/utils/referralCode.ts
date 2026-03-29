import { getAuthSession } from "@/store/authStore";

const REFERRAL_KEYS = [
  "referralCode",
  "ReferralCode",
  "referral_code",
  "referral",
] as const;

/** Pull referral code from a flat API/user object. */
export function extractReferralCode(
  record: Record<string, unknown> | undefined,
): string | undefined {
  if (!record) return undefined;
  for (const k of REFERRAL_KEYS) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const generic = record.code;
  if (typeof generic === "string" && generic.trim()) return generic.trim();
  return undefined;
}

/** Prefer login session `user` / `loginData.user` / `loginData` (README: same shape as API `data`). */
export function getReferralCodeFromSession(): string | undefined {
  const s = getAuthSession();
  const user = s.user as Record<string, unknown> | undefined;
  const loginData = s.loginData as Record<string, unknown> | undefined;
  const loginUser =
    loginData?.user && typeof loginData.user === "object"
      ? (loginData.user as Record<string, unknown>)
      : undefined;

  return (
    extractReferralCode(user) ??
    extractReferralCode(loginUser) ??
    extractReferralCode(loginData)
  );
}

/** Unwrap `{ data: { ... } }` when present. */
export function unwrapRecordPayload(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return o;
}

export function getReferralLandingBaseUrl(): string {
  const env =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_REFERRAL_LANDING_URL as string | undefined)
      : undefined;
  const base = (env && env.trim()) || "https://igamingpro.app";
  return base.replace(/\/$/, "");
}

export function buildReferralShareLink(code: string): string {
  const base = getReferralLandingBaseUrl();
  return `${base}#?code=${encodeURIComponent(code)}`;
}
