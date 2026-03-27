"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStart } from "@/services/public.service";

export default function StartPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    getStart(userId.trim() || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen bg-surface-muted p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Sports Manager</h1>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
        <div className="rounded-sm border border-border bg-surface p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-foreground-secondary">
            User ID (optional)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Leave empty for default"
            className="mb-4 w-full max-w-xs rounded border border-border-strong px-3 py-2 text-sm"
          />
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : data && Object.keys(data).length > 0 ? (
            <div className="prose prose-sm max-w-none">
              {typeof data.message === "string" && <p>{String(data.message)}</p>}
              {typeof data.content === "string" && <p>{String(data.content)}</p>}
              {!data.message && !data.content && (
                <pre className="overflow-auto rounded bg-surface-muted p-4 text-sm">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No start content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
