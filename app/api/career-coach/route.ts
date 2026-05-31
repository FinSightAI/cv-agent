// AI Career Coach — holistic view of the job search and gives priority action items.
// Unique: looks at ALL jobs + resume + patterns and gives CROSS-JOB insights.

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedResumeSchema } from "@/lib/ai/schemas";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are a senior career coach reviewing a job seeker's complete job search.
You see their resume, all their saved jobs, and pipeline status.

Your job: give 3-7 prioritized, highly specific, actionable recommendations.
These should be things they haven't done yet that would meaningfully improve their outcomes.

Focus on:
- CV gaps vs. most common requirements across their target jobs
- Pattern of low match scores — why and what to fix
- Missing keywords/skills that appear in most of their target jobs
- Pipeline health — are they stuck at a stage?
- Application strategy — are they targeting the right roles/seniority/companies?
- Quick wins that could increase response rate this week

Be direct, specific, and reference their actual data.
Avoid generic advice. Each recommendation should reference something in their data.
Write in the candidate's language.`;

const resultSchema = z.object({
  overallAssessment: z.string(),
  priorityScore: z.number().min(0).max(100),
  topRecommendations: z.array(z.object({
    priority: z.enum(["critical", "high", "medium"]),
    title: z.string(),
    action: z.string(),
    impact: z.string(),
    timeToImplement: z.string(),
  })),
  cvStrengths: z.array(z.string()),
  cvWeaknesses: z.array(z.string()),
  missingSkillsAcrossJobs: z.array(z.string()),
  strategyInsight: z.string(),
});

const jobSnapshotSchema = z.object({
  title: z.string(),
  company: z.string(),
  status: z.string(),
  matchScore: z.number().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

const inputSchema = z.object({
  resume: parsedResumeSchema,
  jobs: z.array(jobSnapshotSchema),
  language: z.enum(["he", "en"]).default("he"),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "career-coach", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, jobs, language } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: resultSchema,
    system: withInjectionGuard(SYSTEM + `\n\nRespond in ${language === "he" ? "Hebrew" : "English"}.`),
    prompt: [
      "Analyze this job seeker's complete job search and give specific recommendations:",
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("all_jobs_pipeline", jobs),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
