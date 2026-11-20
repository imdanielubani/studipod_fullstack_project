import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the custom font-size tokens defined in globals.css,
 * otherwise `text-headline` and `text-ink` are treated as conflicting colours
 * and one of them is silently dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["eyebrow", "display", "headline", "title", "lead"],
    },
  },
});

/** Merge conditional class names and resolve conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Returns the first word of a name, used for friendly confirmation copy. */
export function firstName(fullName: string): string {
  const [first] = fullName.trim().split(/\s+/);
  return first ?? "";
}
