// Sync localStorage data to Neon DB.
// Called once from Settings when user wants cloud backup.
// Idempotent — safe to call multiple times.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbSetResume, dbSaveJob, dbSetPrefs } from "@/lib/db/queries";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const syncSchema = z.object({
  resume: z
    .object({ parsed: z.unknown(), rawText: z.string(), updatedAt: z.string() })
    .nullable()
    .optional(),
  jobs: z.array(z.unknown()).optional(),
  prefs: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured — cloud sync unavailable." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { resume, jobs, prefs } = parsed.data;
  let synced = { resume: 0, jobs: 0, prefs: 0 };

  if (resume) {
    await dbSetResume(resume as Parameters<typeof dbSetResume>[0]);
    synced.resume = 1;
  }

  if (jobs?.length) {
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jobs as any[]).map((j) => dbSaveJob(j)),
    );
    synced.jobs = jobs.length;
  }

  if (prefs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dbSetPrefs(prefs as any);
    synced.prefs = 1;
  }

  return NextResponse.json({ ok: true, synced });
}
