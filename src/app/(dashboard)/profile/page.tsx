"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Input, Tabs, Badge } from "@/components";
import { User, FileText, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { getMyInfo, updateMember } from "@/services/user.service";
import type { MyInfo } from "@/types/user.types";

/** README §3: GET /user/getmyinfo/{parentId} — pass parentId from session when auth is wired */
const PROFILE_PARENT_ID = "me";

function getInitial(name?: string, username?: string): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (username?.trim()) return username.trim().charAt(0).toUpperCase();
  return "?";
}

function ProfileForm({
  info,
  onSave,
  saving,
}: {
  info: MyInfo | null;
  onSave: (fields: { name?: string; username?: string; email?: string; phone?: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (info) {
      setName(info.name ?? "");
      setUsername(info.username ?? "");
      setEmail(info.email ?? "");
      setPhone(info.phone ?? "");
    }
  }, [info]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, username, email, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-8">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Personal details
        </h3>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="lg:col-span-2"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
          />
          {info?.role != null && info.role !== "" && (
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Role</span>
              <Badge variant="info" className="w-fit capitalize">
                {info.role}
              </Badge>
            </div>
          )}
        </div>
      </section>

      <div className="border-t border-zinc-100 pt-6 sm:pt-8">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={saving}
          className="w-full sm:w-auto min-w-[140px]"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-zinc-100" />
          ))}
        </div>
      </div>
      <div className="h-10 w-32 rounded-lg bg-zinc-100" />
    </div>
  );
}

export default function ProfilePage() {
  const [info, setInfo] = useState<MyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    let cancelled = false;
    getMyInfo(PROFILE_PARENT_ID)
      .then((res) => {
        if (!cancelled) setInfo(res ?? null);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (fields: {
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
  }) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateMember(fields);
      setInfo((prev) => (prev ? { ...prev, ...fields } : null));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Update failed. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="My Profile" breadcrumbs={["Profile"]} />

      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Profile identity strip – responsive: stacks on mobile, row on md+ */}
        <div className="flex flex-col items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 sm:h-16 sm:w-16 sm:text-2xl"
            aria-hidden
          >
            {loading ? "…" : getInitial(info?.name, info?.username)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-zinc-900 sm:text-xl">
              {loading ? "Loading…" : info?.name || info?.username || "Profile"}
            </h2>
            {info?.username && (
              <p className="mt-0.5 text-sm text-zinc-500">@{info.username}</p>
            )}
            {info?.role != null && info.role !== "" && (
              <div className="mt-2">
                <Badge variant="info" className="capitalize">
                  {info.role}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Tabs
          activeId={activeTab}
          onTabChange={setActiveTab}
          className="w-full"
          tabs={[
            {
              id: "profile",
              label: "Profile",
              icon: <User className="h-4 w-4 shrink-0" />,
              content: (
                <Card className="max-w-2xl">
                  {message && (
                    <div
                      className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      }`}
                      role="alert"
                    >
                      {message.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 shrink-0" />
                      )}
                      <span>{message.text}</span>
                    </div>
                  )}
                  {loading ? (
                    <ProfileSkeleton />
                  ) : (
                    <ProfileForm
                      info={info}
                      onSave={handleSave}
                      saving={saving}
                    />
                  )}
                </Card>
              ),
            },
            {
              id: "account-statement",
              label: "Account Statement",
              icon: <FileText className="h-4 w-4 shrink-0" />,
              content: (
                <Card className="max-w-2xl">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900">
                        View account statement
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        See your transaction history and balance details in Reports.
                      </p>
                    </div>
                    <Link
                      href="/reports/account-statement"
                      className="inline-flex h-10 min-w-[140px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
                    >
                      Open report
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </Link>
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
