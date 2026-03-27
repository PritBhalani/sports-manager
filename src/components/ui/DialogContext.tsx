"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type DialogManagerValue = {
  acquire: () => void;
  release: () => void;
};

const DialogManagerContext = createContext<DialogManagerValue | null>(null);

function setBodyLocked(locked: boolean) {
  if (typeof document === "undefined") return;
  document.body.style.overflow = locked ? "hidden" : "";
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const openCountRef = useRef(0);

  const acquire = useCallback(() => {
    openCountRef.current += 1;
    if (openCountRef.current === 1) setBodyLocked(true);
  }, []);

  const release = useCallback(() => {
    if (openCountRef.current <= 0) return;
    openCountRef.current -= 1;
    if (openCountRef.current === 0) setBodyLocked(false);
  }, []);

  const value = useMemo(() => ({ acquire, release }), [acquire, release]);

  return (
    <DialogManagerContext.Provider value={value}>
      {children}
    </DialogManagerContext.Provider>
  );
}

export function useDialogManager(): DialogManagerValue {
  const ctx = useContext(DialogManagerContext);
  return (
    ctx ?? {
      acquire: () => setBodyLocked(true),
      release: () => setBodyLocked(false),
    }
  );
}
