import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "dark" | "secondary" | "ghost" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] " +
  "transition-[transform,background-color,box-shadow,color] duration-(--duration-base) ease-(--ease-out-expo) " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 " +
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-600";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-button hover:bg-brand-700 hover:shadow-[var(--shadow-button),var(--shadow-glow)]",
  dark: "bg-brand-950 text-white shadow-button hover:bg-brand-900",
  secondary:
    "bg-surface text-ink shadow-hairline hover:bg-brand-50 hover:shadow-[0_0_0_1px_var(--color-brand-200)]",
  ghost: "text-ink hover:bg-brand-950/5",
  light: "bg-white text-brand-950 shadow-button hover:bg-brand-50 focus-visible:outline-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  size,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** Anchor styled as a button — used for in-page section links and CTAs. */
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <a className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </a>
  );
}
