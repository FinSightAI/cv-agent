import { NextRequest, NextResponse } from "next/server";
import { GMAIL_COOKIE, decryptFromCookieValue } from "@/lib/gmail/session";
import { clientWithRefreshToken } from "@/lib/gmail/oauth";
import { google } from "googleapis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const configured =
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET) &&
    Boolean(process.env.SESSION_SECRET);

  const cookieValue = req.cookies.get(GMAIL_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.json({
      connected: false,
      error: configured ? undefined : "Gmail integration not configured",
    });
  }

  const refreshToken = decryptFromCookieValue(cookieValue);
  if (!refreshToken) {
    return NextResponse.json({ connected: false, error: "Invalid session" });
  }

  try {
    const auth = clientWithRefreshToken(refreshToken);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const me = await oauth2.userinfo.get();
    return NextResponse.json({
      connected: true,
      email: me.data.email,
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: (err as Error).message,
    });
  }
}
