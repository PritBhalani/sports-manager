"use client";

import { type ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  title?: string;
  className?: string;
};

export default function Card({ children, title, className = "" }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] ${className}`}
    >
      {title && (
        <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
