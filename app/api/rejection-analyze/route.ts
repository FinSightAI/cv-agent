// Rejection Email Analyzer — reads between the lines of rejection emails.
// Tells the candidate if the door is really open, whether to reply, and what to say.

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You analyze job rejection emails like a seasoned recruiter.

Given a rejection email + context, determine:
- Is this a real rejection or a form letter?
- Did they leave the door open (even slightly)?
- How warm/cold is the tone?
- Should the candidate reply? What should they say?
- Is there any useful signal for the candidate?

Be direct. Candidates need honest advice, not false hope.
Write in the language of the rejection email.`;

const resultSchema = z.object({
  type: z.enum(["form_letter", "personalized", "ambiguous"]),
  doorOpen: z.boolean(),
  warmthLevel: z.enum(["cold", "neutral", "warm"]),
  shouldReply: z.boolean(),
  replyDraft: z.string().optional(),
  insights: z.array(z.string()),
  timeToFollowUp: z.string().optional(),
  oneLineSummary: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "rejection-analyze", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  const { emailText, resume, job } = body as {
    emailText?: string;
    resume?: unknown;
    job?: unknown;
  };

  const prompt = [
    emailText
      ? dataBlock("rejection_email", emailText)
      : "<no_email>No email text provided — this is a ghosting scenario (no response at all).</no_email>",
    resume ? dataBlock("candidate_resume", resume) : "",
    job ? dataBlock("job_description", job) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: resultSchema,
    system: withInjectionGuard(SYSTEM),
    prompt,
  });

  return NextResponse.json({ result: object });
}
