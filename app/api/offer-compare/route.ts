import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a career advisor helping someone choose between job offers.
You have the offer details and their stated priorities.
Give honest, specific advice referencing actual numbers and trade-offs.
Don't just repeat the scores — give real insight about what they might be overlooking.
Consider total comp trajectory, career leverage, market positioning, 3-5 year outlook.
Write in the requested language.`;

const resultSchema = z.object({
  recommendation: z.string(),
  perOfferInsights: z.array(z.object({
    company: z.string(),
    keyStrength: z.string(),
    hiddenRisk: z.string(),
  })),
  longTermThought: z.string(),
  negotiationTip: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "offer-compare", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.offers?.length) return NextResponse.json({ error: "Missing offers" }, { status: 400 });

  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: resultSchema,
    system: withInjectionGuard(SYSTEM + `\n\nRespond in ${body.language === "en" ? "English" : "Hebrew"}.`),
    prompt: [
      "Help this person choose between these job offers:",
      "",
      dataBlock("offers", body.offers),
      dataBlock("priorities", body.priorities),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
