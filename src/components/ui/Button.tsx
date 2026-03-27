"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary border-transparent",
  outline:
    "border border-border-strong bg-surface text-foreground-secondary hover:bg-surface-muted focus:ring-ring",
  danger:
    "bg-error text-white hover:bg-error-hover focus:ring-error border-transparent",
  ghost:
    "bg-transparent text-foreground-secondary hover:bg-surface-2 focus:ring-ring border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-sm px-3 text-xs",
  md: "h-9 gap-2 rounded-sm px-4 text-sm",
  lg: "h-10 gap-2.5 rounded-sm px-5 text-sm",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-4 w-4",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      fullWidth,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const styles = [
      base,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type="button"
        className={styles}
        disabled={disabled}
        {...props}
      >
        {leftIcon && (
          <span className={iconSizeStyles[size] + " flex shrink-0"} aria-hidden>
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className={iconSizeStyles[size] + " flex shrink-0"} aria-hidden>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
