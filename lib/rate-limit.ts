import { NextRequest, NextResponse } from "next/server";

// In-memory sliding-window rate limiter.
// Note: per Fluid Compute instance — multiple regional instances each enforce
// their own budget. That's fine here: the goal is to protect Gemini's free-tier
// quota (10 RPM) from one misbehaving client, not exact fairness.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "anon";
}

export type RateLimit = {
  // Max requests inside the window.
  max: number;
  // Window length in ms.
  windowMs: number;
};

export const DEFAULT_AI_LIMIT: RateLimit = { max: 8, windowMs: 60_000 };
export const HEAVY_AI_LIMIT: RateLimit = { max: 4, windowMs: 60_000 };

export function checkRateLimit(
  req: NextRequest,
  scope: string,
  limit: RateLimit = DEFAULT_AI_LIMIT,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const key = `${scope}:${clientKey(req)}`;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < limit.windowMs);
  if (bucket.hits.length >= limit.max) {
    const oldest = bucket.hits[0]!;
    const retryAfter = Math.ceil((limit.windowMs - (now - oldest)) / 1000);
    buckets.set(key, bucket);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: "rate_limited",
      retryAfter,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

// Variant for streaming routes that return a Response.
export function rateLimitStreamResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
