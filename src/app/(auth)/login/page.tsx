"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Card, Button, Input } from "@/components";
import { setAuthSessionCookie } from "@/hooks/useAuth";
import { getCaptcha, login } from "@/services/auth.service";
import {
  clearAuth,
  setAuthSession,
  AUTH_LOGIN_ENVELOPE_KEY,
} from "@/store/authStore";
import type { CaptchaResponse, LoginResponse } from "@/types/auth.types";

const DEFAULT_DEVICE = "web";
const DEFAULT_MODE = 2;

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
  const loginData =
    res.rawLoginData && typeof res.rawLoginData === "object"
      ? res.rawLoginData
      : undefined;
  setAuthSession({
    primaryToken: typeof primaryToken === "string" ? primaryToken : undefined,
    token: typeof token === "string" ? token : undefined,
    imei: typeof imei === "string" ? imei : undefined,
    userId: typeof res.userId === "string" ? res.userId : undefined,
    claims: Array.isArray(res.claims) ? res.claims : [],
    user: res.user,
    currency: res.currency,
    parent: res.parent,
    ipAddress: typeof res.ipAddress === "string" ? res.ipAddress : undefined,
    // Full API `data` blob — same structure as server (betConfigs, stakeConfigs, …)
    loginData,
  });
  // Optional: persist full envelope { success, messages, data, wsMessageType } for parity with API
  if (
    res.rawLoginEnvelope &&
    typeof res.rawLoginEnvelope === "object" &&
    typeof window !== "undefined"
  ) {
    try {
      window.localStorage.setItem(
        AUTH_LOGIN_ENVELOPE_KEY,
        JSON.stringify(res.rawLoginEnvelope),
      );
    } catch {
      /* ignore */
    }
  }
}

function hasValidLoginTokens(res: LoginResponse): boolean {
  const primaryToken = res.PrimaryToken ?? res.primaryToken;
  const token = res.Token ?? res.token;

  return (
    (typeof primaryToken === "string" && primaryToken.length > 0) ||
    (typeof token === "string" && token.length > 0)
  );
}

function formatLoginErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("captcha") &&
    (normalized.includes("invalid") || normalized.includes("wrong"))
  ) {
    return "The captcha code is incorrect. Please enter the latest captcha and try again.";
  }

  if (
    normalized.includes("invalid credential") ||
    normalized.includes("invalid username") ||
    normalized.includes("invalid password") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return "Username or password is incorrect. Please verify your credentials and try again.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("cors")
  ) {
    return "Unable to reach the server right now. Please check the backend connection and try again.";
  }

  if (normalized.includes("token not returned")) {
    return "Login could not be completed because the server did not return a valid session.";
  }

  return message;
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
      });

      if (!hasValidLoginTokens(res)) {
        throw new Error("Login failed: token not returned by server.");
      }

      applyLoginResponse(res);
      setAuthSessionCookie();
      if (res.IMEI && typeof res.IMEI === "string") setStoredImei(res.IMEI);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      clearAuth();
      setError(
        formatLoginErrorMessage(
          e instanceof Error ? e.message : "Login failed.",
        ),
      );
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
          {error && (
            <div
              className="sticky top-3 z-10 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800 shadow-sm"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Unable to sign in</p>
                <p className="mt-1 text-red-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                aria-label="Dismiss login error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-14 w-[140px] shrink-0 overflow-hidden rounded-md border border-zinc-300 bg-white"
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
                      <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        Image
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    disabled={submitLoading || captchaLoading}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-[#7a8b12] text-white transition-colors hover:bg-[#68770f] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Refresh captcha"
                    title="Refresh captcha"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitLoading || captchaLoading}
          >
            {submitLoading ? "Signing in…" : "Sign in"}
          </Button>

        </form>
      </Card>
    </div>
  );
}
