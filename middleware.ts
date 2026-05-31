import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

// Only enforce auth if Clerk is configured
export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      // All routes are public for now — sign-in is optional
      // Future: uncomment to protect routes
      // if (!isPublicRoute(req)) auth.protect();
    })
  : (_req: NextRequest) => NextResponse.next();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
