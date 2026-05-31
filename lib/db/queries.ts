// Server-side DB queries using Drizzle + Neon.
// Mirrors the localStorage store API so callsites can switch with minimal changes.
// Only imported from API routes (server) — never from client components.

import { eq, desc } from "drizzle-orm";
import { db, schema } from "./index";
import type { StoredJob, StoredResume, StoredPreferences } from "@/lib/storage";

const USER_ID = "local-user"; // single-user MVP default

// ─── Resume ────────────────────────────────────────────────────────────────

export async function dbGetResume(): Promise<StoredResume | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, USER_ID))
    .orderBy(desc(schema.resumes.updatedAt))
    .limit(1);
  const row = rows[0];
  if (!row?.parsed || !row.rawText) return null;
  return {
    parsed: row.parsed as StoredResume["parsed"],
    rawText: row.rawText,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function dbSetResume(r: StoredResume): Promise<void> {
  if (!db) return;
  const existing = await db
    .select({ id: schema.resumes.id })
    .from(schema.resumes)
    .where(eq(schema.resumes.userId, USER_ID))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.resumes)
      .set({
        parsed: r.parsed,
        rawText: r.rawText,
        updatedAt: new Date(r.updatedAt),
      })
      .where(eq(schema.resumes.id, existing[0].id));
  } else {
    await db.insert(schema.resumes).values({
      userId: USER_ID,
      label: "primary",
      isPrimary: true,
      parsed: r.parsed,
      rawText: r.rawText,
      updatedAt: new Date(r.updatedAt),
    });
  }
}

// ─── Jobs ──────────────────────────────────────────────────────────────────

export async function dbGetJobs(): Promise<StoredJob[]> {
  if (!db) return [];
  const rows = await db
    .select()
    .from(schema.jobListings)
    .where(eq(schema.jobListings.userId, USER_ID))
    .orderBy(desc(schema.jobListings.createdAt));

  return rows.map(rowToStoredJob);
}

export async function dbGetJob(id: string): Promise<StoredJob | undefined> {
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(schema.jobListings)
    .where(eq(schema.jobListings.id, id))
    .limit(1);
  return rows[0] ? rowToStoredJob(rows[0]) : undefined;
}

export async function dbSaveJob(j: StoredJob): Promise<void> {
  if (!db) return;
  const existing = await db
    .select({ id: schema.jobListings.id })
    .from(schema.jobListings)
    .where(eq(schema.jobListings.id, j.id))
    .limit(1);

  const values = {
    userId: USER_ID,
    url: j.url,
    title: j.parsed.title,
    company: j.parsed.company,
    location: j.parsed.location,
    remote: j.parsed.remote,
    employmentType: j.parsed.employmentType,
    seniority: j.parsed.seniority,
    rawText: j.rawText,
    parsed: j.parsed,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(schema.jobListings).set(values).where(eq(schema.jobListings.id, j.id));
  } else {
    await db.insert(schema.jobListings).values({ ...values, id: j.id, createdAt: new Date(j.createdAt) });
  }
}

export async function dbDeleteJob(id: string): Promise<void> {
  if (!db) return;
  await db.delete(schema.jobListings).where(eq(schema.jobListings.id, id));
}

// ─── Preferences ───────────────────────────────────────────────────────────

export async function dbGetPrefs(): Promise<StoredPreferences | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.preferences)
    .where(eq(schema.preferences.userId, USER_ID))
    .limit(1);
  return (rows[0]?.data as StoredPreferences) ?? null;
}

export async function dbSetPrefs(p: StoredPreferences): Promise<void> {
  if (!db) return;
  await db
    .insert(schema.preferences)
    .values({ userId: USER_ID, data: p, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.preferences.userId,
      set: { data: p, updatedAt: new Date() },
    });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function rowToStoredJob(row: typeof schema.jobListings.$inferSelect): StoredJob {
  return {
    id: row.id,
    url: row.url ?? undefined,
    parsed: (row.parsed ?? {
      title: row.title,
      company: row.company,
      location: row.location ?? undefined,
      remote: row.remote ?? undefined,
    }) as StoredJob["parsed"],
    rawText: row.rawText ?? "",
    status: "saved",
    createdAt: row.createdAt.toISOString(),
  };
}
