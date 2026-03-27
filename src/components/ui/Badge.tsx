"use client";

type BadgeVariant = "success" | "error" | "warning" | "default" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success-subtle text-success-foreground",
  error: "bg-error-subtle text-error-foreground",
  warning: "bg-warning-subtle text-warning-foreground",
  default: "bg-surface-2 text-foreground-secondary",
  info: "bg-info-subtle text-info-foreground",
};

export type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
