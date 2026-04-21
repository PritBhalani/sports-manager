/**
 * Base API client. Uses apiConfig.baseUrl (NEXT_PUBLIC_API_BASE).
 * Authenticated requests send: Primary-Token, Token, Content-Decoding (IMEI) per README.
 * 401 responses trigger logout + redirect to /login (session expired).
 */
import { apiConfig } from "@/config/api.config";
import { getAuthTokens } from "@/store/authStore";
import { handleUnauthorizedSession } from "@/utils/sessionExpiry";
import { emitMutationToast } from "@/utils/mutationErrorEvents";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type MutationKind = "add" | "update" | "delete";

export type ApiMutationOptions = {
  successMessage?: string;
  suppressSuccessToast?: boolean;
  /**
   * Enable success toast for this request. Kept opt-in to avoid noisy toasts
   * for legacy APIs that use POST/GET for read operations.
   */
  showSuccessToast?: boolean;
  /**
   * Legacy endpoints that mutate via GET can opt into global mutation toasts.
   */
  treatAsMutation?: MutationKind;
};

function authHeaders(): Record<string, string> {
  const t = getAuthTokens();
  const h: Record<string, string> = {};
  if (t.primaryToken) h["Primary-Token"] = t.primaryToken;
  if (t.token) h["Token"] = t.token;
  if (t.imei) h["Content-Decoding"] = t.imei;
  return h;
}

function fullPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function handleUnauthorizedIfNeeded(path: string, status: number): void {
  if (status !== 401) return;
  if (typeof window === "undefined") return;

  const lower = path.toLowerCase();
  if (
    lower.includes("/authenticate/login") ||
    lower.includes("/authenticate/captcha")
  ) {
    return;
  }

  handleUnauthorizedSession();
}

function shouldEmitMutationToast(method: HttpMethod, path: string): boolean {
  if (method === "GET") return false;
  const lower = path.toLowerCase();
  if (
    lower.includes("/authenticate/login") ||
    lower.includes("/authenticate/captcha")
  ) {
    return false;
  }
  return true;
}

function mutationKindFor(
  method: HttpMethod,
  options?: ApiMutationOptions,
): MutationKind {
  if (options?.treatAsMutation) return options.treatAsMutation;
  if (method === "POST") return "add";
  if (method === "DELETE") return "delete";
  return "update";
}

async function parseJsonResponse<T>(
  method: HttpMethod,
  path: string,
  res: Response,
  options?: ApiMutationOptions,
): Promise<T> {
  if (!res.ok && res.status === 401) {
    handleUnauthorizedIfNeeded(path, res.status);
    throw new Error("Session expired. Redirecting to login.");
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  const isMutation =
    shouldEmitMutationToast(method, path) || Boolean(options?.treatAsMutation);
  const mutationKind = mutationKindFor(method, options);
  const envelope = payload as
    | {
        success?: unknown;
        message?: unknown;
        messages?: unknown;
        error?: unknown;
      }
    | null;

  const textFromMessages = Array.isArray(envelope?.messages)
    ? envelope?.messages
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (typeof item === "object" && item && "text" in item) {
            return String((item as { text?: unknown }).text ?? "");
          }
          return String(item);
        })
        .filter(Boolean)
        .join(", ")
    : "";
  const apiMessage =
    (typeof envelope?.message === "string" ? envelope.message : "") ||
    textFromMessages ||
    (typeof envelope?.error === "string" ? envelope.error : "");

  const mutationFallbackErrorMessage = (() => {
    if (mutationKind === "add") return "Unable to add. Please try again.";
    if (mutationKind === "delete") return "Unable to delete. Please try again.";
    if (mutationKind === "update") return "Unable to update. Please try again.";
    return `API error ${res.status}: ${res.statusText}`;
  })();

  if (!res.ok) {
    const message = apiMessage || mutationFallbackErrorMessage;
    if (isMutation) {
      emitMutationToast({
        type: "error",
        method,
        path,
        status: res.status,
        message,
      });
    }
    throw new Error(message);
  }

  if (isMutation && envelope?.success === false) {
    const message = apiMessage || mutationFallbackErrorMessage;
    emitMutationToast({
      type: "error",
      method,
      path,
      status: res.status,
      message,
    });
    throw new Error(message);
  }

  const shouldShowSuccessToast =
    isMutation &&
    !options?.suppressSuccessToast &&
    (options?.showSuccessToast === true || Boolean(options?.successMessage?.trim()));

  if (shouldShowSuccessToast) {
    const defaultSuccessMessage =
      mutationKind === "add"
        ? "Successfully added"
        : mutationKind === "delete"
          ? "Successfully deleted"
          : "Successfully updated";
    emitMutationToast({
      type: "success",
      method,
      path,
      status: res.status,
      message:
        options?.successMessage?.trim() ||
        apiMessage ||
        defaultSuccessMessage,
    });
  }

  return payload as T;
}

async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: ApiMutationOptions,
): Promise<T> {
  const url = `${apiConfig.baseUrl}${fullPath(path)}`;
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return parseJsonResponse<T>(method, path, res, options);
}

export async function apiGet<T>(
  path: string,
  options?: ApiMutationOptions,
): Promise<T> {
  return apiRequest<T>("GET", path, undefined, options);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: ApiMutationOptions,
): Promise<T> {
  return apiRequest<T>("POST", path, body, options);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  options?: ApiMutationOptions,
): Promise<T> {
  return apiRequest<T>("PUT", path, body, options);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: ApiMutationOptions,
): Promise<T> {
  return apiRequest<T>("PATCH", path, body, options);
}

export async function apiDelete<T>(
  path: string,
  body?: unknown,
  options?: ApiMutationOptions,
): Promise<T> {
  return apiRequest<T>("DELETE", path, body, options);
}
