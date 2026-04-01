"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components";
import { getNotification, updateNotification } from "@/services/setting.service";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationBanner } from "@/context/NotificationBannerContext";
import { broadcastNotificationBannerUpdated } from "@/utils/notificationBannerEvents";

export default function NotificationSettingsForm() {
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
      // Global mutation toast handles API errors.
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isAuthenticated && (
        <p className="text-sm text-warning-foreground">Log in to load and save notification text.</p>
      )}
      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-success" : "text-error"}`}
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
      <p className="text-xs text-muted">
        Add one or both messages. The dashboard shows each notice when its text is non-empty.
      </p>
    </form>
  );
}
