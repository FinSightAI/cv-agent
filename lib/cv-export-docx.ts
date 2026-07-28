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

  const doc = new Document({
    creator: r.fullName || "Un-named",
    lastModifiedBy: r.fullName || "Un-named",
    sections: [{ children }],
  });
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
