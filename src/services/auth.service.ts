/**
 * README §1 Authentication
 * GET /authenticate/captcha, POST /authenticate/login (Basic Auth: username, password)
 */
import { apiConfig } from "@/config/api.config";
import { apiPost } from "./apiClient";
import type {
  CaptchaResponse,
  ChangePasswordBody,
  ChangePasswordResponse,
  LoginBody,
  LoginResponse,
} from "@/types/auth.types";

const AUTH = "/authenticate";

type CaptchaApiEnvelope = {
  success?: boolean;
  data?: unknown;
  result?: unknown;
  Data?: unknown;
  Result?: unknown;
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

function joinEnvelopeMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  return messages
    .map((item) => {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object" && "text" in item) {
        const t = (item as { text?: unknown }).text;
        return typeof t === "string" && t.trim() ? t.trim() : "";
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function getApiErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (!payload || typeof payload !== "object") return fallback;

  const maybeMessages = (payload as { messages?: unknown }).messages;
  if (Array.isArray(maybeMessages)) {
    const fromObjects = joinEnvelopeMessages(maybeMessages);
    if (fromObjects) return fromObjects;
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function firstNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const v of candidates) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/** Accept raw image: data URL, http(s) URL, or bare base64. */
function normalizeCaptchaImage(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  if (s.startsWith("data:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `data:image/png;base64,${s}`;
}

/**
 * Normalize captcha JSON from common API shapes: flat body, { data }, { result }, PascalCase fields.
 */
function parseCaptchaPayload(json: unknown): CaptchaResponse {
  if (!isRecord(json)) {
    throw new Error("Captcha response was not a JSON object.");
  }

  const nested =
    (isRecord(json.data) ? json.data : null) ??
    (isRecord(json.result) ? json.result : null) ??
    (isRecord(json.Data) ? json.Data : null) ??
    (isRecord(json.Result) ? json.Result : null) ??
    json;

  const key = firstNonEmptyString(
    nested.key,
    nested.Key,
    nested.sessionKey,
    nested.SessionKey,
    nested.captchaKey,
    nested.CaptchaKey,
  );

  const rawImage = firstNonEmptyString(
    nested.captcha,
    nested.Captcha,
    nested.image,
    nested.Image,
    nested.captchaImage,
    nested.CaptchaImage,
  );

  const image = normalizeCaptchaImage(rawImage);

  if (!key && !image) {
    throw new Error(
      "Captcha response had no usable key or image. The API shape may have changed.",
    );
  }

  return { key, image };
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
  const json: unknown = await res.json();

  if (isRecord(json)) {
    const env = json as CaptchaApiEnvelope;
    if (env.success === false) {
      throw new Error(getApiErrorMessage(json, "Captcha request failed."));
    }
  }

  return parseCaptchaPayload(json);
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

/**
 * POST /user/changepassword
 * Body: currentPassword, newPassword, userId — session headers (Primary-Token, Token, IMEI).
 */
export async function changePassword(body: ChangePasswordBody): Promise<string> {
  const raw = await apiPost<ChangePasswordResponse>("/user/changepassword", body);
  if (!raw || typeof raw !== "object" || raw === null) throw new Error("Invalid response from server.");

  const env = raw as ChangePasswordResponse;
  const msg = joinEnvelopeMessages(env.messages);

  if (env.success === false) {
    throw new Error(msg || "Change password failed.");
  }

  if (msg) return msg;
  return "Updated successfully.";
}
