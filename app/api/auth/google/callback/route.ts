import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail/oauth";
import { encryptToCookieValue, GMAIL_COOKIE } from "@/lib/gmail/session";

export const runtime = "nodejs";

function htmlError(msg: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:sans-serif;padding:2rem;">
<h1>Gmail connection failed</h1>
<p>${msg}</p>
<a href="/inbox">Back</a>
</body></html>`,
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlError(`Google returned: ${error}`);
  }
  if (!code) {
    return htmlError("Missing authorization code");
  }

  const savedState = req.cookies.get("cva_oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return htmlError("State mismatch — try connecting again");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    return htmlError(`Token exchange failed: ${(err as Error).message}`);
  }

  if (!tokens.refresh_token) {
    return htmlError(
      "Google did not return a refresh token. Disconnect the app at myaccount.google.com/permissions and try again.",
    );
  }

  const cookieValue = encryptToCookieValue(tokens.refresh_token);

  const res = NextResponse.redirect(new URL("/inbox?connected=1", req.url));
  res.cookies.set(GMAIL_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  res.cookies.set("cva_gmail_status", "connected", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  res.cookies.delete("cva_oauth_state");
  return res;
}
