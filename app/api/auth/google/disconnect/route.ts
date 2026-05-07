import { NextRequest, NextResponse } from "next/server";
import { GMAIL_COOKIE } from "@/lib/gmail/session";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(GMAIL_COOKIE);
  res.cookies.delete("cva_gmail_status");
  return res;
}
