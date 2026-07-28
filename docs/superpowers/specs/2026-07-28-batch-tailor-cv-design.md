# Batch CV Tailoring from the Jobs list

## Problem

Tailoring a CV to a specific job today is a one-at-a-time flow: open a job, go to the Tailor CV tab, run it, download. A user with many saved jobs (the common case Jobos is built for) has to repeat this per job. This spec adds a bulk action on `/jobs`: select multiple saved jobs, run Tailor CV for each, and download one ZIP with all the tailored resumes as `.docx` files.

Two constraints from the user driving the design:
- **Must be able to tell exactly which job each file is for** — filename has to unambiguously map to a job.
- **Nothing in the generated document may look AI-authored** — this surfaced a real, verified issue (see below), not just a stated preference to work around.

## A pre-existing metadata issue, found while designing this

`lib/cv-export-docx.ts`'s `resumeToDocxBlob` — already shipped, used by `/cv` and the Tailor CV tab, and about to be reused by this feature — builds a `docx` `Document` without setting `creator`/`lastModifiedBy`. Verified directly in `node_modules/docx/dist/index.iife.js`: the library defaults both to the literal string `"Un-named"` when omitted (confirmed via the `options.creator ?? "Un-named"` fallback in the bundled source — not inferred from docs). `title`/`description`/`subject`, by contrast, are only written if explicitly passed (no default), so they're not a concern.

"Un-named" doesn't say "AI," but it's a generic artifact visible in Word's File Properties on every resume this function has ever produced — worth fixing regardless of this feature, and directly in scope since this feature depends on the same function. Fix: pass `creator` and `lastModifiedBy` as `r.fullName || "Un-named"` (same fallback the library already uses, only for the true edge case where the resume has no name at all — never a regression).

## Scope decisions (from brainstorming)

- CV only, no cover letter — keeps this at 1 AI call per job (vs. 2 for a Turbo-Apply-style combo), matching what was actually asked for.
- Reuses the existing `/api/cv/tailor` route as-is — no new API route. Its `HEAVY_AI_LIMIT` scope bucket (`"tailor"`, 4 req/min per IP — verified in `lib/rate-limit.ts`, each named scope gets its own isolated bucket keyed by IP, not a pool shared across endpoints) is exactly the constraint the sequential-with-retry loop below is built around.
- Selection via checkboxes on the existing `/jobs` grid (not a new page, not "run for everything" by default).
- Output: save `tailoredResume` onto each `StoredJob` (so the Tailor CV tab is pre-filled next time, same as running it individually) **and** produce one merged ZIP of `.docx` files for immediate download.
- Explicitly out of scope: cover letters, PDF generation (the app's only PDF path today is the browser's interactive Print dialog — not scriptable for N files unattended; a real batch-friendly PDF would need a new dependency/rendering pipeline and is a separate feature if ever wanted), any new AI route.

## Design

### 1. `lib/cv-export-docx.ts` — metadata fix

```ts
const doc = new Document({
  creator: r.fullName || "Un-named",
  lastModifiedBy: r.fullName || "Un-named",
  sections: [{ children }],
});
```
No signature change — `r` (the `ParsedResume`) already carries `fullName`.

### 2. `app/jobs/page.tsx` — selection state

`JobsPage` gains `selectedIds: Set<string>` and a toggle function. Cards are wrapped in `<Link>` today (whole card navigates to `/jobs/[id]`), so the checkbox must stop the click from bubbling to that `Link` — otherwise checking a box navigates away instead of selecting. Checkbox sits absolutely positioned in the card's top-start corner; its `onClick` calls `e.preventDefault(); e.stopPropagation();` before toggling.

An action bar renders between the filters block and the job grid whenever `selectedIds.size > 0`: "`N selected`", a "select all visible" / "clear" pair, and a "Batch Tailor CV" button. This is inline content (not a fixed/sticky bar) — the app already has a fixed bottom mobile nav, and a second fixed bar would fight it for space.

### 3. `app/jobs/page.tsx` — batch runner

Mirrors the proven pattern in `app/jobs/new/page.tsx`'s `handleBulkAdd`/`parseOneUrl` (sequential loop, per-item retry on 429 honoring `Retry-After`, live per-item status) exactly — same shape, different endpoint and payload:

```ts
type BatchResult = {
  jobId: string;
  title: string;
  company: string;
  status: "pending" | "done" | "failed";
  error?: string;
};
```

Per-job step (`tailorOneJob(job, resume, lang, attempt = 1)`):
1. `POST /api/cv/tailor` with `{ resume, job: job.parsed }`.
2. On `429`: read `retryAfter`, update that row's status to show `retry in {n}s`, wait `(retryAfter + 1) * 1000`ms, retry (max 3 attempts, matching the existing bulk-add cap — then mark failed).
3. On success: `store.saveJob({ ...job, tailoredResume: result })`; build the docx blob via `resumeToDocxBlob(result.resume, lang)`; add it to an in-memory list of `{ filename, blob }` for the ZIP step.
4. On non-429 failure: mark that row failed with the server's error message, continue to the next job (one bad job never stops the batch).

Runs strictly sequentially (`for...of` with `await`, no `Promise.all`) — the whole reason the existing bulk-add feature works reliably against the 4-6 req/min ceiling instead of instantly 429ing.

### 4. Filenames and the ZIP

Reuses the exact sanitizer already in `app/jobs/[id]/page.tsx`'s `downloadZip` (`` `${company}-${title}`.replace(/[^\p{L}\p{N}\-_. ]/gu, "").replace(/\s+/g, "-").slice(0, 60) ``) — same look as every other export filename in the app. Collisions (two selected jobs sanitizing to the same string) get a `-2`, `-3`, ... suffix, tracked in a `Set` of names already used this run.

ZIP root contents:
- `{company}-{title}.docx` per successfully-tailored job.
- `manifest.txt` — one line per successful job, `{company} | {title} | {filename}`, so the mapping is legible without opening every file. Deliberately factual only — no mention of AI, tailoring, or generation anywhere in this file's text, consistent with the metadata fix above.

If zero jobs succeed, no ZIP is generated — a toast reports the failure instead of downloading an empty archive.

### 5. Completion summary

After the loop finishes: a toast/banner reporting `"{succeeded}/{total} succeeded"`; failed rows stay visible in the results list with their error text so the user can see exactly which jobs to retry (they can just re-select those and run the batch again — no separate "retry failed" mechanism needed for a first pass).

### 6. i18n

New keys under a `jobs.batch.*` namespace (he + en) for: selected-count label, select-all, clear, run button, running state, per-job retry message (kept as an inline non-translated string, matching the existing bulk-add convention — `` `retry in ${n}s` `` there is likewise not run through `t()`), completion summary, and "no resume uploaded" guard message (reuses the existing resume-required pattern from the single-job Tailor CV flow — same message, not a new one).

## Testing / verification

No test framework in this repo — verification is `npm run build` after each change plus a live `npm run dev` run: select 2+ saved jobs (including at least one that will be re-selected after a simulated failure, to confirm the batch continues past it), run the batch, confirm the ZIP contains correctly-named `.docx` files plus `manifest.txt`, open one `.docx`'s File Properties and confirm `creator`/`Last Modified By` shows the candidate's real name (not "Un-named"), and confirm each job's `tailoredResume` is now populated when opening its Tailor CV tab individually.
