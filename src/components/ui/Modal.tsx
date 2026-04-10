"use client";

import type { ReactNode } from "react";
import Dialog from "./Dialog";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidthClassName,
  bodyClassName,
  closeOnBackdrop,
}: ModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidthClassName={maxWidthClassName}
      bodyClassName={bodyClassName}
      closeOnBackdrop={closeOnBackdrop}
    >
      {children}
    </Dialog>
  );
}
