"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogManager } from "./DialogContext";

export type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
};

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
  bodyClassName = "max-h-[60vh] overflow-y-auto p-4 sm:p-5",
  closeOnBackdrop = true,
}: DialogProps) {
  const { acquire, release } = useDialogManager();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    activeElementRef.current =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    acquire();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
      release();
      activeElementRef.current?.focus?.();
    };
  }, [isOpen, acquire, release]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative max-h-[90vh] w-full ${maxWidthClassName} overflow-hidden rounded-xl bg-surface shadow-xl focus:outline-none`}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1 text-muted hover:bg-surface-2 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className={bodyClassName}>{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
