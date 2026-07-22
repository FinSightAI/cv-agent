# Word (.docx) export matching Ofir's original resume design

## Problem

The app's only resume export formats are Markdown and a browser-print PDF, both rendered through one fixed generic template (`components/printable-resume.tsx`). Neither preserves the visual design of the user's actual resume — the original uploaded file's formatting is discarded at parse time (`lib/extract.ts` extracts text only, via `pdf-parse`/`mammoth`; the raw file is never persisted). The user wants a real `.docx` download that looks like their own resume, so they can submit it as-is.

## Reference design

Source file: `/Users/s/Desktop/CVs/OFIR SHAMIR.docx`, inspected via `textutil -convert html`. Structure:

- Name: centered, bold, Times New Roman, 18pt
- Contact line + title line: left-aligned, Times New Roman, 12pt
- "PROFESSIONAL SUMMARY" label: bold, **inline** at the start of the summary paragraph (not its own line)
- Other section labels (CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION & CREDENTIALS, etc.): bold, own paragraph line
- Job entries: bold `Company | Title | Dates` line, followed by a bullet list
- Bullets: standard disc, Times New Roman, 12pt
- No colors, borders, tables, columns, or images anywhere

This is a plain, ATS-safe, single-column layout — fully reproducible by generating a `.docx` from structured data, no need to edit or template off the original file.

## Approach

Generate the `.docx` in code with the `docx` npm package (new dependency), mirroring the structure above exactly. Considered and rejected: `docxtemplater` against the original file as a template (adds a template-file dependency and merge-tag maintenance for zero fidelity benefit, since the layout has no elements that require preserving the original file's XML — e.g. no tables/columns/styling that's hard to recreate).

One shared code path for both languages (en/he) — no RTL-specific layout branch. The document is always LTR-structured (left alignment, bullets on the left); Hebrew text renders correctly within it regardless (Unicode bidi handles character-level direction independent of paragraph alignment). Only section-label translation differs between languages, same as the existing `resumeToMarkdown`.

## Implementation

**New file: `lib/cv-export-docx.ts`**
- `resumeToDocxBlob(resume: ParsedResume, lang: Lang): Promise<Blob>` — builds the `docx` `Document` (Sections/Paragraphs/TextRuns per the structure above) and returns `Packer.toBlob()`.
- `downloadDocx(filename: string, blob: Blob)` — triggers the browser download, same pattern as the existing `downloadMarkdown` in `lib/cv-export.ts` (create object URL, temp `<a>`, click, revoke).
- The `docx` package is dynamically imported (`await import("docx")`) inside `resumeToDocxBlob`, not at module top level, so it's not in the initial bundle — it only loads when a user actually clicks the button.

**UI: two call sites, both additive (existing Print/PDF and Markdown buttons stay)**
1. `app/cv/page.tsx` — new "Download as Word" button near the resume view, calling `resumeToDocxBlob(resume.parsed, lang)` on the base (untailored) resume. This page currently has no export buttons at all.
2. `app/jobs/[id]/page.tsx`, Tailor CV tab (~line 720, next to the existing `downloadMarkdown` call) — new "Download as Word" button calling `resumeToDocxBlob(tailored.resume, lang)` on the tailored resume.

Button labels/toasts go through the existing i18n dictionary (`lib/i18n/dictionary.ts`), matching the pattern of neighboring buttons.

## Error handling

`docx` generation is synchronous/local (no network call), so the only realistic failure is the dynamic import itself failing (offline, blocked CDN chunk). Wrap the click handler in try/catch and show the existing toast-error pattern used elsewhere in these files (e.g. `toast.error(...)`) rather than a silent failure.

## Testing / verification

- Manual: click "Download as Word" in both locations, open the resulting `.docx` in Word/Pages, visually compare against `OFIR SHAMIR.docx` (font, bold placement, bullet style, section order).
- No existing automated test suite covers export functions (`resumeToMarkdown` also has no tests) — consistent with current project conventions, no new test infra introduced for this.

## Out of scope

- Multi-template / template picker — this hardcodes Ofir's specific resume style as the one Word export template, consistent with this being a personal tool (per project memory: "User's personal job-search tool, now also a portfolio/open-source project").
- Editing or storing the user's original `.docx` file — not needed; the template is fully code-defined.
- Any change to the existing Print/PDF or Markdown export paths.
