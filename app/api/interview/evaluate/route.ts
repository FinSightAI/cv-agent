import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const evalSchema = z.object({
  overallScore: z.number().min(0).max(100),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no"]),
  summary: z.string(),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(10),
      feedback: z.string(),
      improvement: z.string(),
    }),
  ),
  strongMoments: z.array(z.string()),
  weakMoments: z.array(z.string()),
  modelAnswers: z.array(
    z.object({
      question: z.string(),
      candidateAnswer: z.string().optional(),
      idealAnswer: z.string(),
    }),
  ),
});

const EVALUATOR_SYSTEM = `You are a senior hiring manager evaluating a candidate's interview performance.
You have the full transcript of the interview. Provide honest, specific, actionable feedback.

Dimensions to evaluate:
- Communication: clarity, conciseness, structure
- Technical depth: correctness, specificity, examples
- Behavioral: STAR format, self-awareness, impact
- Culture fit: enthusiasm, questions asked, professionalism
- Overall impression: would you move this candidate forward?

Be honest and specific. Reference exact moments from the transcript.
Write in the same language as the interview transcript.`;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "interview-eval", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.transcript || !body?.resume || !body?.job) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: evalSchema,
    system: withInjectionGuard(EVALUATOR_SYSTEM),
    prompt: [
      "Evaluate this interview transcript:",
      "",
      dataBlock("interview_transcript", body.transcript),
      "",
      dataBlock("candidate_resume", body.resume),
      "",
      dataBlock("target_job", body.job),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
