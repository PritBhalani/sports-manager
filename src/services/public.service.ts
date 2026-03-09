/** README §12 Public (Unauthenticated) — no auth required */
import { apiGet } from "./apiClient";

/** GET /help — help content. No auth. */
export async function getHelp(): Promise<Record<string, unknown>> {
  return apiGet("/help");
}

/** GET /start — data keyed by optional userId. Query: userId (optional). No auth. */
export async function getStart(userId?: string): Promise<Record<string, unknown>> {
  const path = userId ? `/start?userId=${encodeURIComponent(userId)}` : "/start";
  return apiGet(path);
}
