import { NextResponse, type NextRequest } from "next/server";

/**
 * PRIVATE-SITE GATE (HTTP Basic Auth), shared by the proxy.
 *
 * Returns a Response to short-circuit the request, or null to let it through.
 *
 * FAILS CLOSED in production: with SITE_PASSWORD unset on Vercel every request
 * gets a 503, never a silently-public site. A gate that quietly disappears when
 * an env var goes missing is not a gate. Locally (no VERCEL env) it fails open
 * so `next dev` works with no configuration.
 */

/** Constant-time compare: `===` leaks the secret's length and a prefix via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sitePasswordGate(
  req: NextRequest,
  opts: { realm: string; exemptPrefixes: string[] },
): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (opts.exemptPrefixes.some((p) => pathname.startsWith(p))) return null;

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    if (!process.env.VERCEL) return null; // local dev
    return new NextResponse(
      "SITE_PASSWORD is not configured. This deployment is intentionally sealed.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      // The username is ignored on purpose — one shared secret, no user list.
      if (safeEqual(decoded.slice(decoded.indexOf(":") + 1), expected)) return null;
    } catch {
      /* fall through to the challenge */
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "www-authenticate": `Basic realm="${opts.realm}", charset="UTF-8"`,
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
