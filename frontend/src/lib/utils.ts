import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ApiError and other thrown errors have a useful .message; anything else
// (a rejected promise with a non-Error value, for instance) falls back to
// a caller-supplied generic message instead of surfacing "[object Object]".
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
