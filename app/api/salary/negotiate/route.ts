import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SALARY_SYSTEM = `You are a senior career coach specializing in salary negotiation.
Given a job offer and candidate profile, produce a concrete negotiation strategy.

Rules:
- Be specific with numbers (ranges, not vague)
- Give actual scripts (ready to copy-paste)
- Assess risk honestly: some roles/companies punish negotiation
- Consider the candidate's leverage: seniority, alternatives, urgency
- Don't invent data — base advice on what's given
- Write in the same language as the candidate's resume`;

const resultSchema = z.object({
  marketRateMin: z.number(),
  marketRateMax: z.number(),
  counterOfferMin: z.number(),
  counterOfferMax: z.number(),
  currency: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  riskExplanation: z.string(),
  negotiationScript: z.string(),
  leveragePoints: z.array(z.string()),
  redLines: z.array(z.string()),
  nonSalaryPerks: z.array(z.string()),
  openingLine: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "salary-negotiate", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: resultSchema,
    system: withInjectionGuard(SALARY_SYSTEM),
    prompt: [
      `Offered: ${body.offeredSalary} ${body.currency || "ILS"}/month`,
      body.equity ? `Equity: ${body.equity}%` : "",
      body.signingBonus ? `Signing bonus: ${body.signingBonus}` : "",
      "",
      dataBlock("candidate_resume", body.resume),
      dataBlock("target_job", body.job),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ result: object });
}
