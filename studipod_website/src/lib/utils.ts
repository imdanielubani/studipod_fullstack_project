import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Returns the first word of a name, used for friendly confirmation copy. */
export function firstName(fullName: string): string {
  const [first] = fullName.trim().split(/\s+/);
  return first ?? "";
}
