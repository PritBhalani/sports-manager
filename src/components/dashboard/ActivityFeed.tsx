"use client";

import { mockUserActivity } from "@/mocks/activity.mock";
import { formatDateTime } from "@/utils/date";
import { Badge, Card } from "@/components";

export default function ActivityFeed() {
  const items = [...mockUserActivity]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 10);

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
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-zinc-900">
                  {item.username}
                </span>
                <Badge variant="info" className="shrink-0">
                  {item.type}
                </Badge>
              </div>
              <p className="truncate text-xs text-zinc-600">
                {item.description}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {item.module} • {item.ipAddress} • {item.device}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-zinc-400">
                {formatDateTime(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

