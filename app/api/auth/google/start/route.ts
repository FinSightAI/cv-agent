import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authUrl } from "@/lib/gmail/oauth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const state = randomBytes(16).toString("hex");
    const url = authUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("cva_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 min
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
