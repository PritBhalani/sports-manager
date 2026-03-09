/** README §10 Setting (Notifications) */
import { apiGet, apiPost } from "./apiClient";

/** GET /setting/getnotifications */
export async function getNotifications(): Promise<{
  text1?: string;
  text2?: string;
  [key: string]: unknown;
}> {
  return apiGet("/setting/getnotifications");
}

/** POST /setting/updatenotification */
export async function updateNotification(body: {
  text1?: string;
  text2?: string;
}): Promise<unknown> {
  return apiPost("/setting/updatenotification", body);
}
