"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  label?: string;
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, id, ...props }, ref) => {
    const switchId = id ?? (label ? `switch-${label.replace(/\s+/g, "-")}` : undefined);
    return (
      <label
        htmlFor={switchId}
        className="inline-flex cursor-pointer items-center gap-2"
      >
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          {...props}
        />
        <span className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-zinc-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-4" />
        {label && (
          <span className="text-sm font-medium text-zinc-700">{label}</span>
        )}
      </label>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;
