/**
 * README §1 Authentication
 * GET /authenticate/captcha, POST /authenticate/login (Basic Auth: username, password)
 */
import { apiConfig } from "@/config/api.config";
import type { CaptchaResponse, LoginBody, LoginResponse } from "@/types/auth.types";

const AUTH = "/authenticate";

type CaptchaApiEnvelope = {
  success?: boolean;
  data?: {
    key?: string;
    captcha?: string;
  };
};

type LoginApiEnvelope = {
  success?: boolean;
  messages?: string[];
  data?: {
    token?: {
      userId?: string;
      token?: string;
      authToken?: string;
      imei?: string;
    };
    claims?: string[];
    user?: LoginResponse["user"];
    currency?: LoginResponse["currency"];
    parent?: LoginResponse["parent"];
    ipAddress?: string;
  };
};

function getApiErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (!payload || typeof payload !== "object") return fallback;

  const maybeMessages = (payload as { messages?: unknown }).messages;
  if (Array.isArray(maybeMessages)) {
    const text = maybeMessages
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(", ");
    if (text) return text;
  }

  const maybeMessage = (payload as { message?: unknown }).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) {
    return maybeMessage;
  }

  return fallback;
}

/** GET /authenticate/captcha — no auth. Returns captcha payload (key/image). */
export async function getCaptcha(): Promise<CaptchaResponse> {
  const url = `${apiConfig.baseUrl}${AUTH}/captcha`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Captcha error ${res.status}: ${res.statusText}`);
  const json = (await res.json()) as CaptchaResponse | CaptchaApiEnvelope;

  const envelope = json as CaptchaApiEnvelope;
  if (envelope.data) {
    const base64Image =
      typeof envelope.data.captcha === "string" ? envelope.data.captcha : "";
    return {
      key: envelope.data.key,
      image: base64Image ? `data:image/png;base64,${base64Image}` : undefined,
    };
  }

  return json as CaptchaResponse;
}

/**
 * POST /authenticate/login
 * Auth: Basic (username, password). Body: key, captcha, IMEI, device, mode, mobile, username, password.
 */
export async function login(
  username: string,
  password: string,
  body: Omit<LoginBody, "username" | "password">
): Promise<LoginResponse> {
  const url = `${apiConfig.baseUrl}${AUTH}/login`;
  const basic = btoa(`${username}:${password}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    credentials: "include",
    body: JSON.stringify({
      ...body,
      username,
      password,
    }),
  });
  const rawText = await res.text();
  let json: LoginResponse | LoginApiEnvelope | null = null;

  try {
    json = rawText ? (JSON.parse(rawText) as LoginResponse | LoginApiEnvelope) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      getApiErrorMessage(
        json,
        `Login failed ${res.status}: ${res.statusText}`,
      ),
    );
  }

  if (!json) {
    throw new Error("Login failed: empty response from server.");
  }

  const envelope = json as LoginApiEnvelope;

  if (envelope.success === false) {
    throw new Error(getApiErrorMessage(envelope, "Login failed."));
  }

  if (envelope.data?.token) {
    const data = envelope.data as Record<string, unknown>;
    return {
      userId: envelope.data.token.userId,
      token: envelope.data.token.token,
      primaryToken: envelope.data.token.authToken,
      IMEI: envelope.data.token.imei,
      claims: envelope.data.claims ?? [],
      user: envelope.data.user,
      currency: envelope.data.currency,
      parent: envelope.data.parent,
      ipAddress: envelope.data.ipAddress,
      // Preserve exact API payload for localStorage (user.betConfigs, stakeConfigs, etc.)
      rawLoginData: data,
      rawLoginEnvelope: {
        messages: envelope.messages ?? [],
        success: envelope.success,
        data,
        wsMessageType: (envelope as { wsMessageType?: unknown }).wsMessageType,
      },
    };
  }

  const normalized = json as LoginResponse;
  const hasToken =
    typeof (normalized.Token ?? normalized.token) === "string" &&
    Boolean(normalized.Token ?? normalized.token);
  const hasPrimaryToken =
    typeof (normalized.PrimaryToken ?? normalized.primaryToken) === "string" &&
    Boolean(normalized.PrimaryToken ?? normalized.primaryToken);

  if (!hasToken && !hasPrimaryToken) {
    throw new Error(getApiErrorMessage(json, "Login failed: invalid response payload."));
  }

  return normalized;
}
