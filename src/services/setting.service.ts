/** GET /setting/getnotification, POST /setting/updatenotification */
import { apiGet, apiPost } from "./apiClient";

export type NotificationTexts = {
  text1?: string;
  text2?: string;
};

type NotificationEnvelope = {
  success?: boolean;
  data?: NotificationTexts;
  messages?: unknown;
  [key: string]: unknown;
};

/** GET /setting/getnotification — returns `{ data: { text1, text2 } }` */
export async function getNotification(): Promise<NotificationTexts> {
  const raw = await apiGet<unknown>("/setting/getnotification");
  if (!raw || typeof raw !== "object") return {};
  const env = raw as NotificationEnvelope;
  if (env.data && typeof env.data === "object") {
    return {
      text1: typeof env.data.text1 === "string" ? env.data.text1 : undefined,
      text2: typeof env.data.text2 === "string" ? env.data.text2 : undefined,
    };
  }
  const direct = raw as NotificationTexts;
  return {
    text1: typeof direct.text1 === "string" ? direct.text1 : undefined,
    text2: typeof direct.text2 === "string" ? direct.text2 : undefined,
  };
}

/** POST /setting/updatenotification — body `{ text1, text2 }` */
export async function updateNotification(body: NotificationTexts): Promise<unknown> {
  return apiPost("/setting/updatenotification", {
    text1: body.text1 ?? "",
    text2: body.text2 ?? "",
  });
}
