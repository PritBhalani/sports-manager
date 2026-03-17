"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/utils/date";
import { getLoginHistory } from "@/services/token.service";
import { Badge, Card } from "@/components";

export default function ActivityFeed() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    getLoginHistory()
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        const sorted = [...list].sort(
          (a, b) =>
            Date.parse(String(b.createdAt ?? b.date ?? b.timestamp ?? 0)) -
            Date.parse(String(a.createdAt ?? a.date ?? a.timestamp ?? 0)),
        );
        setItems(sorted.slice(0, 10));
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Recent Activity</h3>
        <span className="text-xs text-zinc-500">
          Last {items.length} events
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={String(item.id ?? item.sessionId ?? item.tokenId ?? item.createdAt)}
            className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-zinc-900">
                  {String(item.username ?? item.userCode ?? item.userId ?? "Unknown")}
                </span>
                <Badge variant="info" className="shrink-0">
                  {String(item.type ?? item.eventType ?? "Login")}
                </Badge>
              </div>
              <p className="truncate text-xs text-zinc-600">
                {String(item.description ?? item.comment ?? "Recent authenticated activity")}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {String(item.module ?? "Security")} • {String(item.ipAddress ?? item.ip ?? "—")} • {String(item.device ?? item.userAgent ?? "—")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-zinc-400">
                {formatDateTime(item.createdAt ?? item.date ?? item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

