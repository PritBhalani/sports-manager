"use client";

type BadgeVariant = "success" | "error" | "warning" | "default" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  default: "bg-zinc-100 text-zinc-700",
  info: "bg-blue-100 text-blue-800",
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
