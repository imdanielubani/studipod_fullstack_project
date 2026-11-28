import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge must know the design-system type scale (see globals.css).
 * Without it, `text-caption` and `text-fg` look like two colour classes and
 * one of them is silently dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg',
            'h1',
            'h2',
            'h3',
            'body-md',
            'body-sm',
            'caption',
            'overline',
            'micro',
          ],
        },
      ],
    },
  },
});

/** Merges conditional class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
