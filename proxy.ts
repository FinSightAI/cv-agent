import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { sitePasswordGate } from "@/lib/site-password";

/**
 * Private-site gate, in front of everything else.
 *
 * This is a personal tool, not a public product: the whole site requires
 * SITE_PASSWORD (set it in the Vercel project). It runs BEFORE the Clerk
 * handler so a stranger never reaches application code at all.
 *
 * EXEMPTIONS — each is a caller that CANNOT send Basic credentials:
 *  - /api/auth/google/*  Google redirects the browser back to the callback with
 *                        its own params; a 401 there breaks the OAuth round trip
 *                        with no way for the user to recover.
 *  - /api/cron/*         Vercel Cron sends its own Authorization header, which a
 *                        Basic check would reject.
 *  - /_next, /favicon…   static assets; gating them serves a broken page.
 */
const EXEMPT_PREFIXES = ["/api/auth/google", "/api/cron", "/_next", "/favicon"];

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/cv/parse",
  "/api/jobs/parse",
  "/api/match",
  "/api/cover-letter",
  "/api/cv/(.*)",
  "/api/interview/(.*)",
  "/api/followup",
  "/api/connectors/(.*)",
  "/api/agent",
  "/api/cron/(.*)",
]);

// Only enforce Clerk auth if Clerk is configured.
const clerkHandler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      // All routes are public for now — sign-in is optional
      // Future: uncomment to protect routes
      // if (!isPublicRoute(req)) auth.protect();
    })
  : (_req: NextRequest) => NextResponse.next();

export default function proxy(req: NextRequest, ev: unknown) {
  const sealed = sitePasswordGate(req, { realm: "Jobos", exemptPrefixes: EXEMPT_PREFIXES });
  if (sealed) return sealed;
  return (clerkHandler as (r: NextRequest, e: unknown) => unknown)(req, ev);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
