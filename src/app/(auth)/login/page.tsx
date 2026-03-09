"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components";
import { setAuthSessionCookie } from "@/hooks/useAuth";
import { getCaptcha, login } from "@/services/auth.service";
import { setAuthTokens } from "@/store/authStore";
import type { CaptchaResponse, LoginResponse } from "@/types/auth.types";

const DEFAULT_DEVICE = "web";
const DEFAULT_MODE = 2;
const DEFAULT_MOBILE = "+91";

function getStoredImei(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("imei") ?? "";
  } catch {
    return "";
  }
}

function setStoredImei(value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem("imei", value);
  } catch {
    /* ignore */
  }
}

/** Map login response to auth store (README: Primary-Token, Token, Content-Decoding/IMEI) */
function applyLoginResponse(res: LoginResponse): void {
  const primaryToken = res.PrimaryToken ?? res.primaryToken;
  const token = res.Token ?? res.token;
  const imei = res.IMEI ?? "";
  setAuthTokens({
    primaryToken: typeof primaryToken === "string" ? primaryToken : undefined,
    token: typeof token === "string" ? token : undefined,
    imei: typeof imei === "string" ? imei : undefined,
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const res = await getCaptcha();
      setCaptcha(res);
      setCaptchaInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load captcha");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const key = captcha?.key ?? "";
    if (!username.trim() || !password) {
      setError("Enter username and password.");
      return;
    }
    if (!key && !captchaLoading) {
      setError("Captcha not loaded. Try refreshing.");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await login(username.trim(), password, {
        key,
        captcha: captchaInput.trim(),
        IMEI: getStoredImei() || "web-session",
        device: DEFAULT_DEVICE,
        mode: DEFAULT_MODE,
        mobile: DEFAULT_MOBILE,
      });
      applyLoginResponse(res);
      setAuthSessionCookie();
      if (res.IMEI && typeof res.IMEI === "string") setStoredImei(res.IMEI);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
      loadCaptcha();
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Sports Manager</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to your account</p>
      </div>

      <Card className="w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitLoading}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitLoading}
          />

          {captchaLoading ? (
            <div className="flex h-20 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500">
              Loading captcha…
            </div>
          ) : captcha?.image ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">
                Captcha
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  className="h-12 w-full shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 sm:w-32"
                  style={{
                    backgroundImage: captcha.image.startsWith("data:")
                      ? `url(${captcha.image})`
                      : undefined,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                >
                  {!captcha.image.startsWith("data:") && (
                    <span className="flex h-full items-center justify-center text-xs text-zinc-400">
                      Image
                    </span>
                  )}
                </div>
                <Input
                  placeholder="Enter captcha"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  disabled={submitLoading}
                  className="flex-1"
                />
              </div>
            </div>
          ) : captcha?.key != null && (
            <Input
              label="Captcha"
              placeholder="Enter captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              disabled={submitLoading}
            />
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitLoading || captchaLoading}
          >
            {submitLoading ? "Signing in…" : "Sign in"}
          </Button>

          {!captchaLoading && (
            <button
              type="button"
              onClick={loadCaptcha}
              className="text-sm text-zinc-500 underline hover:text-zinc-700"
            >
              Refresh captcha
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}
