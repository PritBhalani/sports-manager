"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getHelp } from "@/services/public.service";

export default function HelpPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHelp()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Help</h1>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : data && Object.keys(data).length > 0 ? (
            <div className="prose prose-sm max-w-none">
              {typeof data.content === "string" && (
                <div dangerouslySetInnerHTML={{ __html: data.content as string }} />
              )}
              {typeof data.text === "string" && <p>{String(data.text)}</p>}
              {!data.content && !data.text && (
                <pre className="overflow-auto rounded bg-zinc-50 p-4 text-sm">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No help content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
