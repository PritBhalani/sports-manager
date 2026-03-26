"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getNotification } from "@/services/setting.service";
import type { NotificationTexts } from "@/services/setting.service";
import {
  NOTIFICATION_BANNER_BROADCAST_CHANNEL,
  getNotificationBannerTabId,
  type NotificationBannerBroadcastMessage,
} from "@/utils/notificationBannerEvents";

export type NotificationBannerContextValue = {
  text1: string;
  text2: string;
  notice1Visible: boolean;
  notice2Visible: boolean;
  dismissNotice1: () => void;
  dismissNotice2: () => void;
  /** GET /setting/getnotification — e.g. after login or manual refresh */
  refreshNotificationBanners: () => Promise<void>;
  /** Update banners from form without an extra GET (same tab, after save) */
  setNotificationBannerTexts: (next: { text1: string; text2: string }) => void;
};

const NotificationBannerContext = createContext<NotificationBannerContextValue | null>(null);

export function useNotificationBanner(): NotificationBannerContextValue {
  const ctx = useContext(NotificationBannerContext);
  if (!ctx) {
    throw new Error("useNotificationBanner must be used within NotificationBannerProvider");
  }
  return ctx;
}

/** Use on settings page if ever rendered outside the provider (should not happen in dashboard). */
export function useNotificationBannerOptional(): NotificationBannerContextValue | null {
  return useContext(NotificationBannerContext);
}

export function NotificationBannerProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [notice1Visible, setNotice1Visible] = useState(true);
  const [notice2Visible, setNotice2Visible] = useState(true);
  const prevRef = useRef({ t1: "", t2: "" });
  const myTabIdRef = useRef("");

  useEffect(() => {
    myTabIdRef.current = getNotificationBannerTabId();
  }, []);

  const apply = useCallback((data: NotificationTexts) => {
    const t1 = String(data.text1 ?? "").trim();
    const t2 = String(data.text2 ?? "").trim();
    if (t1 && t2) {
      const prev = prevRef.current;
      const changed = t1 !== prev.t1 || t2 !== prev.t2;
      prevRef.current = { t1, t2 };
      setText1(t1);
      setText2(t2);
      if (changed) {
        setNotice1Visible(true);
        setNotice2Visible(true);
      }
    } else {
      prevRef.current = { t1: "", t2: "" };
      setText1("");
      setText2("");
    }
  }, []);

  const refreshNotificationBanners = useCallback(async () => {
    try {
      const data = await getNotification();
      apply(data);
    } catch {
      prevRef.current = { t1: "", t2: "" };
      setText1("");
      setText2("");
    }
  }, [apply]);

  const setNotificationBannerTexts = useCallback(
    (next: { text1: string; text2: string }) => {
      apply({ text1: next.text1, text2: next.text2 });
    },
    [apply],
  );

  // Initial load when session is ready
  useEffect(() => {
    if (!enabled) {
      prevRef.current = { t1: "", t2: "" };
      setText1("");
      setText2("");
      return;
    }
    void refreshNotificationBanners();
  }, [enabled, refreshNotificationBanners]);

  // Other tabs / windows: refetch when someone saves elsewhere
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(NOTIFICATION_BANNER_BROADCAST_CHANNEL);
      bc.onmessage = (event: MessageEvent<NotificationBannerBroadcastMessage>) => {
        const data = event.data;
        if (data?.type !== "updated") return;
        if (data.origin === myTabIdRef.current) return;
        void refreshNotificationBanners();
      };
    } catch {
      /* unsupported */
    }

    return () => {
      bc?.close();
    };
  }, [enabled, refreshNotificationBanners]);

  const value = useMemo<NotificationBannerContextValue>(
    () => ({
      text1,
      text2,
      notice1Visible,
      notice2Visible,
      dismissNotice1: () => setNotice1Visible(false),
      dismissNotice2: () => setNotice2Visible(false),
      refreshNotificationBanners,
      setNotificationBannerTexts,
    }),
    [
      text1,
      text2,
      notice1Visible,
      notice2Visible,
      refreshNotificationBanners,
      setNotificationBannerTexts,
    ],
  );

  return (
    <NotificationBannerContext.Provider value={value}>
      {children}
    </NotificationBannerContext.Provider>
  );
}
