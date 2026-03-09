"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 sm:px-5">
            <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
