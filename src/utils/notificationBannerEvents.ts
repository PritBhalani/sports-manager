/**
 * Cross-tab sync for dashboard notification banners (no polling).
 * Same tab that saves updates UI via context `setNotificationBannerTexts`; other tabs refetch on BroadcastChannel.
 */

const BROADCAST_CHANNEL = "sm-notification-banner";

/** Stable id per browser tab so we can ignore our own broadcast (avoid duplicate GET). */
export function getNotificationBannerTabId(): string {
  if (typeof window === "undefined") return "";
  const key = "__sm_notification_banner_tab_id";
  const w = window as unknown as Record<string, string>;
  if (!w[key]) w[key] = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return w[key];
}

/** Tell other tabs to refetch GET /setting/getnotification */
export function broadcastNotificationBannerUpdated(): void {
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL);
    bc.postMessage({ type: "updated", origin: getNotificationBannerTabId() });
    bc.close();
  } catch {
    /* BroadcastChannel unsupported */
  }
}

export const NOTIFICATION_BANNER_BROADCAST_CHANNEL = BROADCAST_CHANNEL;
export type NotificationBannerBroadcastMessage = {
  type: "updated";
  origin: string;
};
