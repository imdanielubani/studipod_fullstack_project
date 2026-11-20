import { CircleAlert } from "lucide-react";
import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  isOptional?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Labelled text input with accessible hint and error wiring:
 * aria-invalid + aria-describedby point assistive tech at the message.
 */
export function Input({
  id,
  label,
  error,
  hint,
  isOptional = false,
  className,
  ref,
  ...props
}: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-sm font-medium text-ink"
      >
        {label}
        {isOptional ? <span className="text-xs font-normal text-ink-subtle">Optional</span> : null}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-12 w-full rounded-md bg-canvas px-4 text-base text-ink placeholder:text-ink-subtle/80",
          "shadow-[inset_0_0_0_1px_var(--color-line-strong)] outline-none",
          "transition-[box-shadow,background-color] duration-(--duration-base) ease-(--ease-out-expo)",
          "hover:shadow-[inset_0_0_0_1px_var(--color-brand-300)]",
          "focus:bg-surface focus:shadow-[inset_0_0_0_1.5px_var(--color-brand-600),0_0_0_4px_rgb(37_99_235/0.12)]",
          "aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)] aria-invalid:focus:shadow-[inset_0_0_0_1.5px_var(--color-danger),0_0_0_4px_rgb(190_18_60/0.12)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
