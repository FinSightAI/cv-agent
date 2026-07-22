# Word (.docx) Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Download as Word" button (base resume page + tailored-CV tab) that generates a real `.docx` file matching the typography of the user's original resume (Times New Roman, centered bold name, inline bold Summary label, bold section headers, plain bullets — no colors/tables/columns).

**Architecture:** One new client-side module, `lib/cv-export-docx.ts`, builds a `docx` `Document` from the existing `ParsedResume` structured data and returns a `Blob` via `Packer.toBlob()`. Two existing pages each get one new button wired to it. No new API route — this mirrors the existing `resumeToMarkdown`/`downloadMarkdown` pattern in `lib/cv-export.ts`.

**Tech Stack:** `docx` npm package (v9.7.1, confirmed current on npm), dynamically imported (`await import("docx")`) so it's not in the initial bundle.

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-21-word-export-design.md`.
- One shared LTR structure for both `he` and `en` — no RTL-specific paragraph/alignment branch (confirmed with user: no Hebrew content needs RTL layout here).
- Additive only: the existing "Print / Save as PDF" and "Download as Markdown" buttons stay unchanged in both locations.
- No new API route, no new dependency beyond `docx`, no test framework introduced (this project has none — `package.json` has no test script and no `__tests__`/`*.test.*` files anywhere).
- Single hardcoded template (not a template picker) — this is a personal-tool feature, not a generic system (see spec's "Out of scope").

---

### Task 1: `lib/cv-export-docx.ts` — core doc-building module

**Files:**
- Create: `lib/cv-export-docx.ts`
- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**
- Produces: `resumeToDocxBlob(r: ParsedResume, lang: "he" | "en"): Promise<Blob>` and `downloadDocx(filename: string, blob: Blob): void` — both consumed by Task 2 and Task 3.
- Consumes: `ParsedResume` type from `@/lib/ai/schemas` (type-only import, already defined, no changes needed there).

- [ ] **Step 1: Install the `docx` package**

Run: `npm install docx@9.7.1`
Expected: `package.json` gains `"docx": "^9.7.1"` under `dependencies`, `package-lock.json` updates, no errors.

- [ ] **Step 2: Create `lib/cv-export-docx.ts`**

```ts
import type { Paragraph } from "docx";
import type { ParsedResume } from "@/lib/ai/schemas";

const FONT = "Times New Roman";
const SIZE_NAME = 36; // 18pt (docx sizes are in half-points)
const SIZE_BODY = 24; // 12pt

function sectionLabel(lang: "he" | "en", he: string, en: string): string {
  return (lang === "he" ? he : en).toUpperCase();
}

export async function resumeToDocxBlob(r: ParsedResume, lang: "he" | "en"): Promise<Blob> {
  const { Document, Paragraph, TextRun, AlignmentType, Packer } = await import("docx");
  const present = lang === "he" ? "היום" : "Present";
  const children: Paragraph[] = [];

  if (r.fullName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: r.fullName, bold: true, font: FONT, size: SIZE_NAME })],
      }),
    );
  }

  const contact = [r.email, r.phone, r.location, ...(r.links ?? []).map((l) => l.label || l.url)].filter(
    (v): v is string => Boolean(v),
  );
  if (contact.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contact.join(" | "), font: FONT, size: SIZE_BODY })],
      }),
    );
  }

  if (r.headline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: r.headline, font: FONT, size: SIZE_BODY })],
      }),
    );
  }

  if (r.summary) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: `${sectionLabel(lang, "תקציר", "Summary")} `,
            bold: true,
            font: FONT,
            size: SIZE_BODY,
          }),
          new TextRun({ text: r.summary, font: FONT, size: SIZE_BODY }),
        ],
      }),
    );
  }

  if (r.skills?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: sectionLabel(lang, "כישורים", "Skills"), bold: true, font: FONT, size: SIZE_BODY }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: r.skills.join(", "), font: FONT, size: SIZE_BODY })],
      }),
    );
  }

  if (r.experience?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: sectionLabel(lang, "ניסיון תעסוקתי", "Experience"),
            bold: true,
            font: FONT,
            size: SIZE_BODY,
          }),
        ],
      }),
    );
    for (const e of r.experience) {
      const dateRange = `${e.startDate ?? ""} – ${e.current ? present : e.endDate ?? ""}`;
      const headerText = [e.company, e.location ? `${e.title} (${e.location})` : e.title, dateRange].join(" | ");
      children.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [new TextRun({ text: headerText, bold: true, font: FONT, size: SIZE_BODY })],
        }),
      );
      for (const b of e.bullets ?? []) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: b, font: FONT, size: SIZE_BODY })],
          }),
        );
      }
    }
  }

  if (r.education?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: sectionLabel(lang, "השכלה", "Education"), bold: true, font: FONT, size: SIZE_BODY }),
        ],
      }),
    );
    for (const ed of r.education) {
      const meta = [ed.degree, ed.field].filter(Boolean).join(", ");
      const date = ed.startDate || ed.endDate ? ` (${ed.startDate ?? ""} – ${ed.endDate ?? ""})` : "";
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: ed.institution, bold: true, font: FONT, size: SIZE_BODY }),
            new TextRun({ text: `${meta ? ` — ${meta}` : ""}${date}`, font: FONT, size: SIZE_BODY }),
          ],
        }),
      );
    }
  }

  if (r.certifications?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: sectionLabel(lang, "הסמכות", "Certifications"),
            bold: true,
            font: FONT,
            size: SIZE_BODY,
          }),
        ],
      }),
    );
    for (const c of r.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: c.name, bold: true, font: FONT, size: SIZE_BODY }),
            new TextRun({
              text: `${c.issuer ? `, ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`,
              font: FONT,
              size: SIZE_BODY,
            }),
          ],
        }),
      );
    }
  }

  if (r.projects?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: sectionLabel(lang, "פרויקטים", "Projects"), bold: true, font: FONT, size: SIZE_BODY }),
        ],
      }),
    );
    for (const p of r.projects) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: p.name, bold: true, font: FONT, size: SIZE_BODY }),
            new TextRun({
              text: `${p.description ? ` — ${p.description}` : ""}${p.url ? ` (${p.url})` : ""}`,
              font: FONT,
              size: SIZE_BODY,
            }),
          ],
        }),
      );
    }
  }

  if (r.languages?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: sectionLabel(lang, "שפות", "Languages"), bold: true, font: FONT, size: SIZE_BODY }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: r.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", "),
            font: FONT,
            size: SIZE_BODY,
          }),
        ],
      }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

export function downloadDocx(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Verify it actually produces a valid docx, standalone**

This project has no test runner, so verify by exercising the real function directly with `tsx` (already available via `npx`) against sample data — this is a genuine run, not a type-check.

Create a scratch file (outside the repo, e.g. `/tmp/verify-docx.mjs` — do not commit it):

```js
import { resumeToDocxBlob } from "/Users/s/Desktop/Jobos/lib/cv-export-docx.ts";
import { writeFileSync } from "node:fs";

const sample = {
  fullName: "Test Person",
  headline: "Senior Test Engineer",
  email: "test@example.com",
  summary: "A summary paragraph.",
  skills: ["A", "B", "C"],
  experience: [
    { company: "Acme", title: "Engineer", startDate: "2020", current: true, bullets: ["Did a thing."] },
  ],
  education: [{ institution: "State University", degree: "B.Sc." }],
};

const blob = await resumeToDocxBlob(sample, "en");
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("/tmp/verify-docx-output.docx", buf);
console.log("OK bytes:", buf.length, "magic:", buf.subarray(0, 2).toString(), "type:", blob.type);
```

Run: `npx tsx /tmp/verify-docx.mjs`
Expected: `OK bytes: <some number > 1000> magic: PK type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Note: the `@/lib/ai/schemas` import in `cv-export-docx.ts` is `import type` only (type-only), so it's erased at compile time and doesn't need path-alias resolution to run standalone — no `tsconfig-paths` setup needed for this check.

If it fails with a `docx`-related error (not a path/module-resolution error), re-check the constructor shapes against `node_modules/docx/dist/index.d.ts` in the project — the shapes above were empirically verified against `docx@9.7.1` during planning, so a failure here means the installed version differs from what was verified.

- [ ] **Step 4: Delete the scratch verification file**

Run: `rm /tmp/verify-docx.mjs /tmp/verify-docx-output.docx`

- [ ] **Step 5: Commit**

```bash
git add lib/cv-export-docx.ts package.json package-lock.json
git commit -m "feat: add resumeToDocxBlob — generates a .docx matching the user's original resume typography"
```

---

### Task 2: Wire "Download as Word" into the Tailor CV tab

**Files:**
- Modify: `app/jobs/[id]/page.tsx:71` (imports), `app/jobs/[id]/page.tsx:716-728` (button block)
- Modify: `lib/i18n/dictionary.ts:557-558` (he block), `lib/i18n/dictionary.ts:1341-1342` (en block), plus one new shared error key in both blocks

**Interfaces:**
- Consumes: `resumeToDocxBlob`, `downloadDocx` from Task 1 (`@/lib/cv-export-docx`); existing `filename`, `lang`, `tailored.resume`, `t` already in scope in this component (see `app/jobs/[id]/page.tsx:697,722`).

- [ ] **Step 1: Add dictionary keys**

In `lib/i18n/dictionary.ts`, in the `he` block, find:

```ts
    "tailor.print": "הדפסה / שמירה כ-PDF",
    "tailor.downloadMd": "הורד כ-Markdown",
```

Replace with:

```ts
    "tailor.print": "הדפסה / שמירה כ-PDF",
    "tailor.downloadMd": "הורד כ-Markdown",
    "tailor.downloadWord": "הורד כקובץ Word",
    "export.docxFailed": "יצירת קובץ Word נכשלה",
```

In the `en` block, find:

```ts
    "tailor.print": "Print / Save as PDF",
    "tailor.downloadMd": "Download as Markdown",
```

Replace with:

```ts
    "tailor.print": "Print / Save as PDF",
    "tailor.downloadMd": "Download as Markdown",
    "tailor.downloadWord": "Download as Word",
    "export.docxFailed": "Word export failed",
```

- [ ] **Step 2: Add the import**

In `app/jobs/[id]/page.tsx`, find line 71:

```ts
import { downloadMarkdown, resumeToMarkdown, coverLetterToHtml } from "@/lib/cv-export";
```

Add directly after it:

```ts
import { downloadDocx, resumeToDocxBlob } from "@/lib/cv-export-docx";
```

- [ ] **Step 3: Add the button**

Find (around line 716-728):

```tsx
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadMarkdown(
                    `${filename}.md`,
                    resumeToMarkdown(tailored.resume, lang),
                  )
                }
              >
                <Download className="size-4 me-1" />
                {t("tailor.downloadMd")}
              </Button>
            </div>
```

Replace with:

```tsx
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadMarkdown(
                    `${filename}.md`,
                    resumeToMarkdown(tailored.resume, lang),
                  )
                }
              >
                <Download className="size-4 me-1" />
                {t("tailor.downloadMd")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const blob = await resumeToDocxBlob(tailored.resume, lang);
                    downloadDocx(`${filename}.docx`, blob);
                  } catch {
                    toast.error(t("export.docxFailed"));
                  }
                }}
              >
                <Download className="size-4 me-1" />
                {t("tailor.downloadWord")}
              </Button>
            </div>
```

- [ ] **Step 4: Verify with a real build**

Run: `npm run build`
Expected: build succeeds with no type errors (this project has no separate test suite — a clean `next build` is the correctness gate used elsewhere in this repo's history).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open a job that already has a tailored CV (Tailor CV tab), click "Download as Word" / "הורד כקובץ Word". Confirm a `.docx` file downloads and opens correctly in Word/Pages, showing the tailored resume content in the Times New Roman / bold-headers / bullets style.

- [ ] **Step 6: Commit**

```bash
git add app/jobs/[id]/page.tsx lib/i18n/dictionary.ts
git commit -m "feat: add Word download to the Tailor CV tab"
```

---

### Task 3: Wire "Download as Word" into the base Resume page

**Files:**
- Modify: `app/cv/page.tsx:21` (icon import), `app/cv/page.tsx:22` (add new import line), `app/cv/page.tsx:185` (add `lang` to destructure), `app/cv/page.tsx:232-241` (button block)
- Modify: `lib/i18n/dictionary.ts:173` (he block), `lib/i18n/dictionary.ts:970` (en block)

**Interfaces:**
- Consumes: `resumeToDocxBlob`, `downloadDocx` from Task 1; `export.docxFailed` dictionary key from Task 2 (reused, not re-added).

- [ ] **Step 1: Add dictionary keys**

In `lib/i18n/dictionary.ts`, in the `he` block, find:

```ts
    "cv.uploadAnother": "העלה אחר",
```

Replace with:

```ts
    "cv.uploadAnother": "העלה אחר",
    "cv.downloadWord": "הורד כקובץ Word",
```

In the `en` block, find:

```ts
    "cv.uploadAnother": "Upload another",
```

Replace with:

```ts
    "cv.uploadAnother": "Upload another",
    "cv.downloadWord": "Download as Word",
```

- [ ] **Step 2: Add imports**

In `app/cv/page.tsx`, find line 21:

```ts
import { Upload, FileText, Loader2, Sparkles, Pencil, X, Check, Plus } from "lucide-react";
```

Replace with:

```ts
import { Upload, FileText, Loader2, Sparkles, Pencil, X, Check, Plus, Download } from "lucide-react";
```

Directly after the existing `import type { ParsedResume } from "@/lib/ai/schemas";` line (line 22), add:

```ts
import { downloadDocx, resumeToDocxBlob } from "@/lib/cv-export-docx";
```

- [ ] **Step 3: Add `lang` to the `ResumeView` component's `useLang()` call**

Find (line 185):

```ts
  const { t } = useLang();
```

This is inside `function ResumeView({ parsed, rawText, onReset, onSave }: {...}) {` (line 174-184). Replace the matched line with:

```ts
  const { t, lang } = useLang();
```

- [ ] **Step 4: Add the button**

Find (lines 232-241):

```tsx
            <>
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil className="size-4 me-1.5" />
                {t("cv.edit")}
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                {t("cv.uploadAnother")}
              </Button>
            </>
```

Replace with:

```tsx
            <>
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil className="size-4 me-1.5" />
                {t("cv.edit")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const blob = await resumeToDocxBlob(parsed, lang);
                    downloadDocx(`${parsed.fullName || "resume"}.docx`, blob);
                  } catch {
                    toast.error(t("export.docxFailed"));
                  }
                }}
              >
                <Download className="size-4 me-1.5" />
                {t("cv.downloadWord")}
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                {t("cv.uploadAnother")}
              </Button>
            </>
```

- [ ] **Step 5: Verify with a real build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `/cv` with a parsed resume loaded, click "Download as Word" / "הורד כקובץ Word". Confirm the file downloads and opens correctly, matching the same style as Task 2's output.

- [ ] **Step 7: Commit**

```bash
git add app/cv/page.tsx lib/i18n/dictionary.ts
git commit -m "feat: add Word download to the base Resume page"
```
