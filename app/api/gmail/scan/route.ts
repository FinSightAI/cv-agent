import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GMAIL_COOKIE, decryptFromCookieValue } from "@/lib/gmail/session";
import { clientWithRefreshToken } from "@/lib/gmail/oauth";
import { buildQuery, listMessages, type RawEmail } from "@/lib/gmail/scan";
import { classifyEmail, type EmailClassification } from "@/lib/gmail/classify";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 90;

// Tighter limit: each scan invokes the model up to `limit` times (25 max).
const SCAN_LIMIT = { max: 2, windowMs: 60_000 };

const inputSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      status: z.string(),
    }),
  ),
  daysBack: z.number().int().min(1).max(180).default(60),
  limit: z.number().int().min(1).max(50).default(25),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "gmail-scan", SCAN_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const cookieValue = req.cookies.get(GMAIL_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 401 });
  }
  const refreshToken = decryptFromCookieValue(cookieValue);
  if (!refreshToken) {
    return NextResponse.json({ error: "Invalid Gmail session" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { jobs, daysBack, limit } = parsed.data;
  const companies = Array.from(new Set(jobs.map((j) => j.company))).filter(Boolean);

  let messages: RawEmail[];
  try {
    const auth = clientWithRefreshToken(refreshToken);
    const query = buildQuery({ companies, daysBack });
    messages = await listMessages(auth, query, limit);
  } catch (err) {
    return NextResponse.json(
      { error: `Gmail query failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  if (messages.length === 0) {
    return NextResponse.json({ messages: [], classifications: [] });
  }

  // Classify in parallel with light concurrency.
  const classifications: (EmailClassification & { messageId: string })[] = [];
  for (let i = 0; i < messages.length; i += 4) {
    const batch = messages.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (m) => {
        try {
          const c = await classifyEmail(m, jobs);
          return { ...c, messageId: m.id };
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) if (r) classifications.push(r);
  }

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      subject: m.subject,
      from: m.from,
      date: m.date,
      snippet: m.snippet,
      unread: m.unread,
    })),
    classifications,
  });
}
