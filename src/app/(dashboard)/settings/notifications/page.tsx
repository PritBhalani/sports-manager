"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input } from "@/components";
import { getNotification, updateNotification } from "@/services/setting.service";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationBanner } from "@/context/NotificationBannerContext";
import { broadcastNotificationBannerUpdated } from "@/utils/notificationBannerEvents";

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const { setNotificationBannerTexts } = useNotificationBanner();
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getNotification()
      .then((data) => {
        if (cancelled) return;
        setText1(String(data.text1 ?? ""));
        setText2(String(data.text2 ?? ""));
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load notification settings." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateNotification({ text1, text2 });
      setNotificationBannerTexts({ text1, text2 });
      broadcastNotificationBannerUpdated();
      setMessage({ type: "success", text: "Notification settings saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Notifications"
        breadcrumbs={["Website", "Forms"]}
        description="Dashboard banner messages (GET /setting/getnotification, POST /setting/updatenotification)"
      />
      <Card title="Maintenance / announcement messages" className="max-w-xl">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isAuthenticated && (
              <p className="text-sm text-amber-700">Log in to load and save notification text.</p>
            )}
            {message && (
              <p
                className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
                role="alert"
              >
                {message.text}
              </p>
            )}
            <Input
              label="Message 1 (text1)"
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="First dashboard notice…"
            />
            <Input
              label="Message 2 (text2)"
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="Second dashboard notice…"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={saving || !isAuthenticated}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              Both messages must be non-empty for the dashboard to show the two notice banners. After Save, banners
              update immediately on this tab; other open tabs pick up changes via browser sync (no polling).
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
