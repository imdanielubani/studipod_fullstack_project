import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4',
    'text-body-md font-medium whitespace-nowrap transition-colors',
    'focus-visible:shadow-focus focus-visible:outline-none',
    'disabled:pointer-events-none aria-disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-action text-on-brand hover:bg-action-hover active:bg-action-pressed disabled:bg-action-disabled disabled:text-fg-disabled',
        secondary:
          'border border-line-strong bg-action-secondary text-fg hover:bg-action-secondary-hover disabled:border-line disabled:bg-action-disabled disabled:text-fg-disabled',
        danger:
          'bg-[var(--sp-action-danger)] text-on-brand hover:bg-[var(--sp-action-danger-hover)] disabled:bg-action-disabled disabled:text-fg-disabled',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      fullWidth: false,
    },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, disables the button and announces `loadingLabel`. */
    isLoading?: boolean;
    /** Text shown while loading (for example "Signing in…"). */
    loadingLabel?: ReactNode;
  };

export function Button({
  className,
  variant,
  fullWidth,
  isLoading = false,
  loadingLabel,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, fullWidth }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Inline text action styled as a link (for example "Forgot password?"). */
export function TextButton({ className, type = 'button', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-sm text-body-md font-medium text-link hover:underline',
        'focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:text-fg-disabled disabled:no-underline',
        className,
      )}
      {...props}
    />
  );
}
