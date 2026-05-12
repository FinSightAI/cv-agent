import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Lang } from "@/lib/i18n/dictionary"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLocale(lang: Lang): string {
  return lang === "he" ? "he-IL" : "en-US"
}

export function formatDate(
  d: string | number | Date | undefined,
  lang: Lang,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (d === undefined || d === null || d === "") return ""
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString(getLocale(lang), opts)
}

// Wraps fetch + JSON error handling for AI routes.
// Throws an Error whose .message is already a user-facing string:
// - 429 → i18n "error.rateLimit" message (caller passes `t`)
// - other non-OK → the route's { error } field, or the provided fallback
// On 2xx returns parsed JSON.
export async function aiFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  opts: { t: (k: import("@/lib/i18n/dictionary").Key) => string; fallback: string },
): Promise<T> {
  const res = await fetch(input, init)
  if (res.status === 429) {
    throw new Error(opts.t("error.rateLimit"))
  }
  if (!res.ok) {
    const { error } = await res
      .json()
      .catch(() => ({ error: opts.fallback }))
    throw new Error(error || opts.fallback)
  }
  return (await res.json()) as T
}
