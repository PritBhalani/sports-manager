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
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  MUTATION_TOAST_EVENT,
  type MutationToastDetail,
} from "@/utils/mutationErrorEvents";

type ToastItem = {
  id: number;
  type: "success" | "error";
  message: string;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
  closeToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_TIMEOUT_MS = 4000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timeoutByIdRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const closeToast = useCallback((id: number) => {
    const timeout = timeoutByIdRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutByIdRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev, { id, ...toast }]);
      const timeout = setTimeout(() => {
        closeToast(id);
      }, TOAST_TIMEOUT_MS);
      timeoutByIdRef.current.set(id, timeout);
    },
    [closeToast],
  );

  useEffect(() => {
    const onMutationToast = (event: Event) => {
      const customEvent = event as CustomEvent<MutationToastDetail>;
      const payload = customEvent.detail;
      if (!payload?.message) return;
      showToast({ type: payload.type, message: payload.message });
    };
    window.addEventListener(MUTATION_TOAST_EVENT, onMutationToast as EventListener);
    return () => {
      window.removeEventListener(
        MUTATION_TOAST_EVENT,
        onMutationToast as EventListener,
      );
      timeoutByIdRef.current.forEach((t) => clearTimeout(t));
      timeoutByIdRef.current.clear();
    };
  }, [showToast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      closeToast,
    }),
    [showToast, closeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(calc(100vw-2rem),26rem)] flex-col gap-2">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-sm border px-3 py-3 text-sm shadow-sm ${
                isSuccess
                  ? "border-success/30 bg-success-subtle text-success-foreground"
                  : "border-error/30 bg-error-subtle text-error-foreground"
              }`}
              role="alert"
              aria-live="assertive"
            >
              {isSuccess ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {isSuccess ? "Success" : "Request failed"}
                </p>
                <p className="mt-1">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => closeToast(toast.id)}
                className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-black/10"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
