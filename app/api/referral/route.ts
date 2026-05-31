import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedResumeSchema, parsedJobSchema } from "@/lib/ai/schemas";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const REFERRAL_SYSTEM = `You write short, human LinkedIn referral request messages.

Rules:
- Total length: 4-6 sentences, under 100 words
- Tone: warm, professional, NOT desperate. Like reaching out to a friend-of-a-friend.
- Sentence 1: Brief connection context ("We met at X" or "I saw you work at Y")
- Sentence 2: What you're applying for specifically
- Sentence 3: One concrete reason you're a strong fit (from the resume)
- Sentence 4: The ask — clear and low-friction ("Would you be open to a quick chat?" or "If you feel comfortable, a referral would mean a lot")
- Never: "I know you're busy", "I hate to bother you", "I would be eternally grateful"
- Write in the language of the candidate's resume`;

const resultSchema = z.object({
  message: z.string(),
  subjectLine: z.string(),
  followUp: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "referral", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.resume || !body?.job) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: resultSchema,
    system: withInjectionGuard(REFERRAL_SYSTEM),
    prompt: [
      `Contact name: ${body.contactName ?? "a connection"}`,
      `How you know them: ${body.howYouKnow ?? "through mutual contacts"}`,
      "",
      dataBlock("candidate_resume", body.resume),
      dataBlock("target_job", body.job),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
