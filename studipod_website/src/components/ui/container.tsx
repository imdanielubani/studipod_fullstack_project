import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: "default" | "narrow" | "wide";
  children: ReactNode;
}

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
} as const;

/** Horizontally centred page column with responsive gutters. */
export function Container({
  as: Component = "div",
  size = "default",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
