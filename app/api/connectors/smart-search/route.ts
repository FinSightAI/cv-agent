import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchLinkedIn } from "@/lib/connectors/linkedin-search";
import {
  DEFAULT_WORKDAY_BOARDS,
  searchWorkday,
} from "@/lib/connectors/workday-search";
import { searchAllJobs } from "@/lib/connectors/alljobs";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  targetRoles: z.array(z.string()).default([]),
  techMust: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  remoteOk: z.boolean().optional(),
  recentDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]).optional(),
  workdayBoards: z.array(z.string()).optional(),
  sources: z.array(z.enum(["linkedin", "workday", "alljobs"])).default(["linkedin", "workday"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { targetRoles, techMust, locations, remoteOk, recentDays, workdayBoards, sources } =
    parsed.data;

  const keywords = buildKeywordQuery(targetRoles, techMust);
  const keywordsHe = targetRoles.join(" ");
  if (!keywords) {
    return NextResponse.json(
      { error: "Add at least one target role or required tech in your preferences." },
      { status: 400 },
    );
  }

  const tasks: Promise<{ source: string; jobs: unknown[]; error?: string }>[] = [];

  if (sources.includes("linkedin")) {
    tasks.push(
      searchLinkedIn({
        keywords,
        location: locations[0],
        remoteOnly: remoteOk === true && locations.length === 0,
        recentDays: recentDays ?? 14,
        pages: 2,
      })
        .then((jobs) => ({ source: "linkedin" as const, jobs }))
        .catch((err: Error) => ({ source: "linkedin" as const, jobs: [], error: err.message })),
    );
  }

  if (sources.includes("workday")) {
    const boards = workdayBoards?.length ? workdayBoards : DEFAULT_WORKDAY_BOARDS;
    tasks.push(
      searchWorkday({ keywords, boards, perBoardLimit: 20 })
        .then((jobs) => ({ source: "workday" as const, jobs }))
        .catch((err: Error) => ({ source: "workday" as const, jobs: [], error: err.message })),
    );
  }

  if (sources.includes("alljobs")) {
    // Search AllJobs with Hebrew keywords first, fall back to English if empty
    const alljobsKeywords = keywordsHe.trim() || keywords;
    tasks.push(
      searchAllJobs({ keywords: alljobsKeywords, maxResults: 40 })
        .then((jobs) => ({ source: "alljobs" as const, jobs }))
        .catch((err: Error) => ({ source: "alljobs" as const, jobs: [], error: err.message })),
    );
  }

  const results = await Promise.all(tasks);
  const errors = results
    .filter((r) => r.error)
    .map((r) => `${r.source}: ${r.error}`);
  const allJobs = results.flatMap((r) => r.jobs);

  return NextResponse.json({
    keywords,
    jobs: allJobs,
    counts: Object.fromEntries(results.map((r) => [r.source, r.jobs.length])),
    errors: errors.length ? errors : undefined,
  });
}

function buildKeywordQuery(roles: string[], tech: string[]): string {
  const r = roles.filter(Boolean).slice(0, 3);
  const t = tech.filter(Boolean).slice(0, 2);
  if (r.length === 0 && t.length === 0) return "";
  const rolePart = r.length ? r.map((x) => `"${x}"`).join(" OR ") : "";
  const techPart = t.length ? t.join(" ") : "";
  return [rolePart && `(${rolePart})`, techPart].filter(Boolean).join(" ").trim();
}
