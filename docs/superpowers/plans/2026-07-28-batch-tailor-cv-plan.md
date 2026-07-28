# Batch CV Tailoring from the Jobs List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user select multiple saved jobs on `/jobs` and run Tailor CV for all of them in one action, ending in a single downloaded ZIP of `.docx` files (one per successfully-tailored job) plus a `manifest.txt` mapping company/title to filename. Along the way, fix a verified metadata bug in the shared `resumeToDocxBlob` helper so generated `.docx` files carry the candidate's real name instead of the `docx` library's default `"Un-named"`.

**Architecture:** No new API route — reuses the existing `/api/cv/tailor` route, called sequentially (never concurrently) per selected job, with manual 429/`Retry-After` retry mirroring the proven pattern already in `app/jobs/new/page.tsx`'s `parseOneUrl`. All new UI logic lives in `app/jobs/page.tsx` (selection state, action bar, the batch loop, ZIP assembly via `jszip`, already a dependency). `lib/cv-export-docx.ts` gets a one-line metadata fix.

**Tech Stack:** Same as the rest of Jobos — `jszip` (already a dependency, used by the existing per-job ZIP in `app/jobs/[id]/page.tsx`), `docx` (already a dependency), existing `Checkbox` primitive (`components/ui/checkbox.tsx`, base-ui backed).

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-28-batch-tailor-cv-design.md`.
- CV only — no cover letter generation in this batch flow.
- Strictly sequential processing of selected jobs — never `Promise.all`. `/api/cv/tailor`'s rate-limit scope (`"tailor"`) allows 4 requests/minute per IP (verified in `lib/rate-limit.ts` — each named scope has its own isolated bucket).
- Do **not** use the `aiFetchJson` helper (`lib/utils.ts`) for the batch loop — it throws immediately on 429 with no retry, which is wrong here since hitting 429 mid-batch is the expected, not exceptional, case. Use a manual `fetch` + retry loop instead, mirroring `parseOneUrl`.
- One failed job must not stop the batch — continue to the next job, report failures at the end.
- If zero jobs succeed, do not generate/download an empty ZIP.
- No test framework in this repo — verification is `npm run build` plus manual `npm run dev` exercise.

---

### Task 1: Fix `resumeToDocxBlob` document metadata

**Files:**
- Modify: `lib/cv-export-docx.ts:211`

**Interfaces:**
- No signature change to `resumeToDocxBlob(r: ParsedResume, lang: "he" | "en"): Promise<Blob>` — existing call sites (`/cv` page, Tailor CV tab) are unaffected and get the fix automatically.

- [ ] **Step 1: Set `creator`/`lastModifiedBy` on the `Document`**

Find (line 211):

```ts
  const doc = new Document({ sections: [{ children }] });
```

Replace with:

```ts
  const doc = new Document({
    creator: r.fullName || "Un-named",
    lastModifiedBy: r.fullName || "Un-named",
    sections: [{ children }],
  });
```

- [ ] **Step 2: Verify the metadata actually lands in the generated file**

This project has no test runner, so verify by generating a real `.docx` and inspecting its internal `docProps/core.xml` directly — a `.docx` is a zip archive, so this is a genuine file-format check, not a type-check.

Create a scratch file (outside the repo — do not commit it): `/tmp/verify-docx-metadata.mjs`

```js
import { resumeToDocxBlob } from "/Users/s/Desktop/Jobos/lib/cv-export-docx.ts";
import { writeFileSync } from "node:fs";

const sample = { fullName: "Ada Lovelace", headline: "Engineer", skills: ["A"] };
const blob = await resumeToDocxBlob(sample, "en");
writeFileSync("/tmp/verify-docx-metadata.docx", Buffer.from(await blob.arrayBuffer()));
console.log("wrote /tmp/verify-docx-metadata.docx");
```

Run: `npx tsx /tmp/verify-docx-metadata.mjs`
Expected: `wrote /tmp/verify-docx-metadata.docx`

Then inspect the core properties XML directly (`.docx` is a zip):

Run: `unzip -p /tmp/verify-docx-metadata.docx docProps/core.xml`
Expected: output contains `<dc:creator>Ada Lovelace</dc:creator>` and `<cp:lastModifiedBy>Ada Lovelace</cp:lastModifiedBy>` — and must NOT contain the string `Un-named` anywhere in the output.

If `Un-named` still appears, the edit in Step 1 didn't take — re-check `lib/cv-export-docx.ts:211-215` before continuing.

- [ ] **Step 3: Clean up scratch files**

Run: `rm /tmp/verify-docx-metadata.mjs /tmp/verify-docx-metadata.docx`

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/cv-export-docx.ts
git commit -m "fix: set real creator/lastModifiedBy metadata on generated .docx files"
```

---

### Task 2: i18n keys for the batch UI

**Files:**
- Modify: `lib/i18n/dictionary.ts`

**Interfaces:**
- Produces: `jobs.batch.*` keys (he + en) — consumed by Task 3 and Task 4. Reuses the existing `tailor.noResume` key (already present, used by the single-job Tailor CV flow at `app/jobs/[id]/page.tsx:651`) rather than adding a duplicate.

- [ ] **Step 1: Add the Hebrew block**

Find (line 233-234, inside the `he` block):

```ts
    "jobs.new.added": "המשרה נוספה",
    "jobs.new.error": "הדבק קישור או טקסט של משרה",
```

Add directly after it:

```ts
    "jobs.new.added": "המשרה נוספה",
    "jobs.new.error": "הדבק קישור או טקסט של משרה",
    "jobs.batch.selected": "נבחרו",
    "jobs.batch.selectAll": "בחר הכל",
    "jobs.batch.clearSelection": "נקה בחירה",
    "jobs.batch.run": "האצר קורות חיים",
    "jobs.batch.running": "מריץ...",
    "jobs.batch.summary": "הצליחו",
    "jobs.batch.zipFailed": "לא הופק אף קובץ — כל המשרות נכשלו",
```

- [ ] **Step 2: Add the English block**

Find (line ~1090, inside the `en` block — locate the equivalent `jobs.new.added`/`jobs.new.error` pair):

```ts
    "jobs.new.added": "Job added",
    "jobs.new.error": "Paste a job link or text",
```

Add directly after it:

```ts
    "jobs.new.added": "Job added",
    "jobs.new.error": "Paste a job link or text",
    "jobs.batch.selected": "selected",
    "jobs.batch.selectAll": "Select all",
    "jobs.batch.clearSelection": "Clear selection",
    "jobs.batch.run": "Batch Tailor CV",
    "jobs.batch.running": "Running...",
    "jobs.batch.summary": "succeeded",
    "jobs.batch.zipFailed": "No files produced — every job failed",
```

(Exact surrounding text in the `en` block should be confirmed by reading the file — the Hebrew and English `jobs.new.*` blocks mirror each other in the same relative order, so search for the `en`-block occurrence of `"jobs.new.added"` rather than assuming a line number, since earlier edits in this session may have shifted line numbers.)

- [ ] **Step 3: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dictionary.ts
git commit -m "feat: add i18n keys for batch CV tailoring"
```

---

### Task 3: Selection state, checkbox, and action bar on `/jobs`

**Files:**
- Modify: `app/jobs/page.tsx`

**Interfaces:**
- Produces: `selectedIds: Set<string>` state and `toggleSelect`/`selectAllVisible`/`clearSelection` handlers on `JobsPage`, passed to `JobCard` as new props `selected: boolean` and `onToggleSelect: (id: string, e: React.MouseEvent) => void`. Consumed by Task 4 (the run button in the action bar calls into Task 4's batch runner with `Array.from(selectedIds)`).

- [ ] **Step 1: Import `Checkbox`**

Find (line 5):

```ts
import { Button } from "@/components/ui/button";
```

Add directly after it:

```ts
import { Checkbox } from "@/components/ui/checkbox";
```

- [ ] **Step 2: Add selection state to `JobsPage`**

Find (line 63-67):

```ts
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState<ScoreFilter>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
```

Replace with:

```ts
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState<ScoreFilter>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Add selection handlers**

Find (line 92-97, the `clearFilters` function):

```ts
  function clearFilters() {
    setQuery("");
    setStatus("all");
    setMinScore("all");
    setRemoteOnly(false);
  }
```

Add directly after it:

```ts

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map((j) => j.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }
```

- [ ] **Step 4: Add the action bar**

Find (line 177, the closing of the filters block):

```ts
        </div>
      )}

      {/* Empty states */}
```

Replace with:

```ts
        </div>
      )}

      {/* Batch selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} {t("jobs.batch.selected")}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllVisible}>
            {t("jobs.batch.selectAll")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            {t("jobs.batch.clearSelection")}
          </Button>
          <div className="flex-1" />
          <BatchTailorButton
            jobIds={Array.from(selectedIds)}
            jobs={jobs}
            lang={lang}
            t={t}
            onDone={clearSelection}
          />
        </div>
      )}

      {/* Empty states */}
```

`BatchTailorButton` is added in Task 4 — this task leaves it as a forward reference (the component doesn't exist yet), so **do not run the build after this step alone**; Task 4's Step 1 adds the component in the same file before the next build check.

- [ ] **Step 5: Wire the checkbox into `JobCard`**

Find (line 221-229):

```ts
function JobCard({
  job: j,
  lang,
  t,
}: {
  job: StoredJob;
  lang: string;
  t: (k: Key) => string;
}) {
```

Replace with:

```ts
function JobCard({
  job: j,
  lang,
  t,
  selected,
  onToggleSelect,
}: {
  job: StoredJob;
  lang: string;
  t: (k: Key) => string;
  selected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
}) {
```

Find (line 236-238):

```ts
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
```

Replace with:

```ts
        <CardContent className="p-4 space-y-3">
          {/* Selection checkbox — stopPropagation so it never triggers the card's Link navigation */}
          <div
            className="absolute start-2 top-2 z-10"
            onClick={(e) => onToggleSelect(j.id, e)}
          >
            <Checkbox checked={selected} onCheckedChange={() => {}} />
          </div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 ps-6">
```

The checkbox's own `onCheckedChange` is a no-op (`() => {}`) — the wrapping `div`'s `onClick` is what actually toggles selection (via `onToggleSelect`, which already calls `preventDefault`/`stopPropagation`), so there's only one source of truth for the toggle, not two competing handlers.

Find (line 233-234):

```ts
      <Card
        className={`glass hover:border-primary/40 transition-all h-full border-s-2 ${STATUS_BORDER[j.status]}`}
      >
```

Replace with:

```ts
      <Card
        className={`glass hover:border-primary/40 transition-all h-full border-s-2 relative ${STATUS_BORDER[j.status]}`}
      >
```

(`relative` is required on the `Card` so the checkbox's `absolute` positioning is relative to the card, not the page.)

- [ ] **Step 6: Pass the new props at the call site**

Find (line 212-214):

```ts
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} lang={lang} t={t} />
          ))}
```

Replace with:

```ts
          {filtered.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              lang={lang}
              t={t}
              selected={selectedIds.has(j.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
```

- [ ] **Step 7: Commit**

This task's changes reference `BatchTailorButton`, which doesn't exist until Task 4 — commit together with Task 4 instead of separately (see Task 4's Step 5).

---

### Task 4: Batch runner and ZIP assembly

**Files:**
- Modify: `app/jobs/page.tsx` (adds the `BatchTailorButton` component referenced by Task 3)

**Interfaces:**
- Consumes: `store.getResume()`, `store.saveJob()` (`lib/storage.ts`, unchanged), `resumeToDocxBlob` (`lib/cv-export-docx.ts`, fixed in Task 1), `TailoredResume` type (`lib/ai/schemas.ts`, unchanged).
- Produces: `BatchTailorButton({ jobIds, jobs, lang, t, onDone })` — the component Task 3 already references.

- [ ] **Step 1: Add imports**

Find (line 1-24, the top of `app/jobs/page.tsx` after Task 3's edits):

```ts
import { Plus, Briefcase, Search, X, Sparkles, Clock } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";
```

Replace with:

```ts
import { Plus, Briefcase, Search, X, Sparkles, Clock, Loader2, Download } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";
import { resumeToDocxBlob } from "@/lib/cv-export-docx";
import type { TailoredResume } from "@/lib/ai/schemas";
import { toast } from "sonner";
```

(Check whether `toast` is already imported elsewhere in this file before adding — if it's already there, skip re-adding it to avoid a duplicate-import build error.)

- [ ] **Step 2: Add the filename sanitizer and dedup helper**

Add this above the `JobCard` function definition (i.e. directly after `JobsPage`'s closing brace, before `function JobCard(...)`):

```ts
function sanitizeFilename(company: string, title: string): string {
  return `${company}-${title}`
    .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function dedupeFilename(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  const name = `${base}-${i}`;
  used.add(name);
  return name;
}
```

- [ ] **Step 3: Add the `BatchTailorButton` component**

Add this after the helpers from Step 2 (still before `function JobCard(...)`):

```ts
type BatchStatus = "pending" | "retrying" | "done" | "failed";
type BatchRow = { jobId: string; title: string; company: string; status: BatchStatus; error?: string };

function BatchTailorButton({
  jobIds,
  jobs,
  lang,
  t,
  onDone,
}: {
  jobIds: string[];
  jobs: StoredJob[];
  lang: string;
  t: (k: Key) => string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<BatchRow[]>([]);

  async function tailorOne(
    job: StoredJob,
    resumeParsed: unknown,
    used: Set<string>,
    files: { filename: string; blob: Blob; company: string; title: string }[],
    attempt = 1,
  ): Promise<void> {
    const res = await fetch("/api/cv/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: resumeParsed, job: job.parsed }),
    });

    if (res.status === 429) {
      const { retryAfter } = await res.json().catch(() => ({ retryAfter: 15 }));
      if (attempt >= 3) throw new Error(t("error.rateLimit"));
      setRows((prev) =>
        prev.map((r) =>
          r.jobId === job.id ? { ...r, status: "retrying", error: `retry in ${retryAfter}s` } : r,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      return tailorOne(job, resumeParsed, used, files, attempt + 1);
    }

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Tailor failed" }));
      throw new Error(error || "Tailor failed");
    }

    const { result } = (await res.json()) as { result: TailoredResume };
    const updated: StoredJob = { ...job, tailoredResume: result };
    store.saveJob(updated);

    const blob = await resumeToDocxBlob(result.resume, lang as "he" | "en");
    const base = sanitizeFilename(job.parsed.company, job.parsed.title);
    const filename = dedupeFilename(base, used);
    files.push({
      filename: `${filename}.docx`,
      blob,
      company: job.parsed.company,
      title: job.parsed.title,
    });

    setRows((prev) => (prev.map((r) => (r.jobId === job.id ? { ...r, status: "done" } : r))));
  }

  async function run() {
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error(t("tailor.noResume"));
      return;
    }
    const selected = jobs.filter((j) => jobIds.includes(j.id));
    setBusy(true);
    setRows(selected.map((j) => ({ jobId: j.id, title: j.parsed.title, company: j.parsed.company, status: "pending" })));

    const used = new Set<string>();
    const files: { filename: string; blob: Blob; company: string; title: string }[] = [];

    // Strictly sequential: /api/cv/tailor allows 4 req/min per IP (HEAVY_AI_LIMIT,
    // its own scope bucket — see lib/rate-limit.ts). Firing this concurrently
    // just turns into a wall of 429s, same lesson already learned for bulk job add.
    for (const job of selected) {
      try {
        await tailorOne(job, resume.parsed, used, files);
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.jobId === job.id ? { ...r, status: "failed", error: (err as Error).message } : r,
          ),
        );
      }
    }

    if (files.length === 0) {
      toast.error(t("jobs.batch.zipFailed"));
      setBusy(false);
      return;
    }

    const manifest = files.map((f) => `${f.company} | ${f.title} | ${f.filename}`).join("\n");

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("manifest.txt", manifest);
    for (const f of files) zip.file(f.filename, f.blob);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored-cvs.zip";
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${files.length}/${selected.length} ${t("jobs.batch.summary")}`);
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex items-center gap-2">
      {rows.length > 0 && busy && (
        <span className="text-xs text-muted-foreground">
          {rows.filter((r) => r.status === "done").length}/{rows.length}
        </span>
      )}
      <Button type="button" size="sm" onClick={run} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 me-1 animate-spin" />
        ) : (
          <Download className="size-4 me-1" />
        )}
        {busy ? t("jobs.batch.running") : t("jobs.batch.run")}
      </Button>
    </div>
  );
}
```

The completion toast's numerator is `files.length` (every successful `tailorOne` push to `files` is 1:1 with a job that succeeded), not a `rows` filter — reading `rows` synchronously right after the loop would risk a stale-closure undercount since `setRows` updates are asynchronous.

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors. If `toast` was already imported in this file (per Step 1's note), the build will fail with a duplicate-import error — fix by removing the duplicate line, not the new one, since Task 3's action bar needs `toast` too if not already present.

- [ ] **Step 5: Commit (covers both Task 3 and Task 4 — Task 3 alone doesn't build)**

```bash
git add app/jobs/page.tsx
git commit -m "feat: batch Tailor CV across selected jobs, downloads one ZIP"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Set up test data**

Ensure a resume is loaded (`store.getResume()` returns a value — reuse one from a prior session if present). Ensure at least 2 saved jobs exist on `/jobs` (add via `/jobs/new` if needed).

- [ ] **Step 3: Select and run**

On `/jobs`, click the checkbox on 2+ job cards — confirm clicking the checkbox does **not** navigate to the job detail page (this is the exact bug the `stopPropagation` wrapper in Task 3 Step 5 exists to prevent). Confirm the action bar appears with the correct selected count. Click "Batch Tailor CV" / "האצר קורות חיים".

- [ ] **Step 4: Inspect the result**

Confirm a `tailored-cvs.zip` downloads. Unzip it and confirm:
- One `.docx` per selected job, named `{company}-{title}.docx`.
- `manifest.txt` present, listing `company | title` for each successful job, with no mention of AI/tailoring/generation anywhere in its text.
- Opening one `.docx`'s File → Properties (or `unzip -p file.docx docProps/core.xml`) shows the real candidate name as creator/last-modified-by, not "Un-named".

- [ ] **Step 5: Confirm per-job state updated**

Open one of the batch-processed jobs individually (`/jobs/[id]`, Tailor CV tab) and confirm it already shows the tailored resume that was just generated in the batch — not a blank "generate" prompt.

- [ ] **Step 6: Probe the failure path**

Temporarily rename or break the resume in localStorage (or clear it) and re-run the batch — confirm the `tailor.noResume` toast fires and no ZIP downloads. Restore the resume afterward.

- [ ] **Step 7: Report results**

Any check in Steps 3-6 that fails is a bug to fix before this plan is complete — do not mark this task done on a partial pass.
