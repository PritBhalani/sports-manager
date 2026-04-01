"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronsUpDown } from "lucide-react";

const fieldClass =
  "box-border min-h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted";

const plainClass =
  "h-9 min-h-0 w-full appearance-none border-0 bg-transparent py-0 pl-2 pr-2 text-sm font-bold text-foreground shadow-none focus:outline-none focus:ring-0 disabled:text-muted";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  /** Defaults to [] — use `placeholder` for a single empty option. */
  options?: SelectOption[];
  placeholder?: string;
  /** `plain`: borderless, for embedding in toolbars / split controls (no chevron). */
  variant?: "field" | "plain";
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options = [],
      placeholder,
      variant = "field",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const base = variant === "plain" ? plainClass : fieldClass;
    return (
      <div className="min-w-0">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1 block text-sm font-medium text-foreground-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${base} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((opt) => (
              <option key={`${opt.value}-${opt.label}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {variant === "field" ? (
            <ChevronsUpDown
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
          ) : null}
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
