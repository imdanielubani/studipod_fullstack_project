'use client';

import { CircleAlert, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TextFieldProps = Omit<ComponentProps<'input'>, 'size'> & {
  label: string;
  leadingIcon?: LucideIcon;
  /** Element rendered inside the field after the input (for example a reveal toggle). */
  trailing?: ReactNode;
  /** Neutral helper text under the field. Hidden when `error` is set. */
  helper?: ReactNode;
  /** Error message under the field; also marks the field invalid. */
  error?: ReactNode;
  /** Marks the field invalid without a message (the message is shown elsewhere). */
  isInvalid?: boolean;
};

/**
 * Labelled text input with optional leading icon, trailing slot and helper/error text.
 * States follow the design system: default, filled, focus (2px border + ring), error, disabled.
 */
export function TextField({
  label,
  leadingIcon: LeadingIcon,
  trailing,
  helper,
  error,
  isInvalid = false,
  id,
  className,
  disabled,
  'aria-describedby': describedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const invalid = isInvalid || Boolean(error);
  const message = error ?? helper;
  const describedByIds = [message ? messageId : null, describedBy ?? null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-body-md font-medium text-fg">
        {label}
      </label>
      <div
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border bg-surface px-3 transition-[border-color,box-shadow]',
          invalid
            ? 'border-danger focus-within:shadow-[0_0_0_1px_var(--sp-border-danger),0_0_0_4px_rgb(220_38_38/0.2)]'
            : [
                'border-line has-[input:not(:placeholder-shown)]:border-line-strong',
                'focus-within:border-focus focus-within:shadow-[0_0_0_1px_var(--sp-border-focus),0_0_0_4px_rgb(37_99_235/0.35)] focus-within:has-[input:not(:placeholder-shown)]:border-focus',
              ],
          disabled && 'bg-subtle',
        )}
      >
        {LeadingIcon ? (
          <LeadingIcon
            aria-hidden
            className={cn('size-[18px] shrink-0', disabled ? 'text-fg-disabled' : 'text-icon')}
          />
        ) : null}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedByIds || undefined}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-body-md text-fg outline-none placeholder:text-fg-tertiary',
            'disabled:cursor-not-allowed disabled:text-fg-disabled',
          )}
          {...inputProps}
        />
        {trailing}
      </div>
      {message ? (
        <FieldMessage id={messageId} tone={error ? 'error' : 'neutral'}>
          {message}
        </FieldMessage>
      ) : null}
    </div>
  );
}

type FieldMessageProps = {
  id?: string;
  tone: 'error' | 'neutral';
  children: ReactNode;
  className?: string;
};

/** Helper or error line shown under a field. */
export function FieldMessage({ id, tone, children, className }: FieldMessageProps) {
  return (
    <p
      id={id}
      className={cn(
        'flex items-start gap-1 text-caption',
        tone === 'error' ? 'text-danger-fg' : 'text-fg-secondary',
        className,
      )}
    >
      {tone === 'error' ? (
        <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-icon-danger" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>;

/** Password input with a show/hide toggle. */
export function PasswordField({ disabled, ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      disabled={disabled}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={disabled}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className={cn(
            '-mr-1 grid size-7 shrink-0 place-items-center rounded-sm text-icon hover:text-icon-strong',
            'focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:text-fg-disabled',
          )}
        >
          <Icon aria-hidden className="size-[18px]" />
        </button>
      }
    />
  );
}
