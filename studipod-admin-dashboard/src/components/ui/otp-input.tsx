'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

const DIGIT_PATTERN = /\D/g;

type OtpInputProps = {
  /** Digits entered so far (0..length characters, digits only). */
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** id of the visible label; the cells are grouped under it. */
  labelledBy: string;
  /** id of the helper/error message describing the group. */
  describedBy?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

function onlyDigits(raw: string, max: number): string {
  return raw.replace(DIGIT_PATTERN, '').slice(0, max);
}

/**
 * One-time code entry as separate digit cells.
 * Typing advances focus, Backspace moves back, and pasting or OS autofill
 * of the full code fills every cell at once.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  labelledBy,
  describedBy,
  isInvalid = false,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusCell = (index: number) => {
    const target = cellRefs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const writeFrom = (startIndex: number, incoming: string) => {
    const before = value.slice(0, startIndex);
    const next = onlyDigits(before + incoming, length);
    onChange(next);
    focusCell(next.length >= length ? length - 1 : next.length);
  };

  const handleInput = (index: number, raw: string, typedCharacter: string | null) => {
    const keystroke = typedCharacter ? onlyDigits(typedCharacter, 1) : '';
    if (keystroke && index < value.length) {
      // Overwrite a single existing digit in place and move on.
      onChange(value.slice(0, index) + keystroke + value.slice(index + 1));
      focusCell(index + 1);
      return;
    }
    // A keystroke into the next empty cell, or OS autofill of the whole code.
    const incoming = keystroke || onlyDigits(raw, length);
    if (incoming) writeFrom(Math.min(index, value.length), incoming);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (digits[index]) {
          onChange(value.slice(0, index) + value.slice(index + 1));
          focusCell(index);
        } else if (index > 0) {
          onChange(value.slice(0, index - 1) + value.slice(index));
          focusCell(index - 1);
        }
        break;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusCell(Math.min(index + 1, value.length));
        break;
      case 'Home':
        event.preventDefault();
        focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        focusCell(Math.min(value.length, length - 1));
        break;
      default:
        break;
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = onlyDigits(event.clipboardData.getData('text'), length);
    if (pasted) writeFrom(pasted.length >= length ? 0 : Math.min(index, value.length), pasted);
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex w-full items-center justify-between gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            cellRefs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          // Only the first empty cell (or the last cell) accepts focus via Tab.
          tabIndex={index === Math.min(value.length, length - 1) ? 0 : -1}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={isInvalid || undefined}
          onChange={(event) => {
            const native = event.nativeEvent;
            const typed =
              typeof InputEvent !== 'undefined' &&
              native instanceof InputEvent &&
              native.inputType === 'insertText'
                ? native.data
                : null;
            handleInput(index, event.target.value, typed);
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          className={cn(
            'h-[60px] w-full max-w-[52px] min-w-0 rounded-md border bg-surface text-center text-h2 font-semibold text-fg caret-[var(--sp-brand-primary)] transition-[border-color,box-shadow] outline-none',
            digit ? 'border-line-strong' : 'border-line',
            'focus:border-focus focus:shadow-[0_0_0_1px_var(--sp-border-focus),0_0_0_4px_rgb(37_99_235/0.35)]',
            isInvalid &&
              'border-danger text-danger-fg focus:border-danger focus:shadow-[0_0_0_1px_var(--sp-border-danger),0_0_0_4px_rgb(220_38_38/0.2)]',
            disabled && 'cursor-not-allowed bg-subtle text-fg-disabled',
          )}
        />
      ))}
    </div>
  );
}
