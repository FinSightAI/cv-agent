import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cv-agent-opal.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Private tool: no public discovery. Also password-gated in middleware.ts.
      { userAgent: "*", disallow: "/" },
    ],
    // No sitemap declared: nothing here is meant to be found.
  };
}
