import type { ParsedResume } from "@/lib/ai/schemas";

export function resumeToMarkdown(r: ParsedResume, lang: "he" | "en"): string {
  const out: string[] = [];
  if (r.fullName) out.push(`# ${r.fullName}`);
  if (r.headline) out.push(`*${r.headline}*`);
  const contact: string[] = [];
  if (r.email) contact.push(r.email);
  if (r.phone) contact.push(r.phone);
  if (r.location) contact.push(r.location);
  for (const l of r.links ?? []) contact.push(`[${l.label || l.url}](${l.url})`);
  if (contact.length) out.push(contact.join(" · "));

  if (r.summary) {
    out.push("", `## ${lang === "he" ? "תקציר" : "Summary"}`, "", r.summary);
  }
  if (r.skills?.length) {
    out.push("", `## ${lang === "he" ? "כישורים" : "Skills"}`, "", r.skills.join(", "));
  }
  if (r.experience?.length) {
    out.push("", `## ${lang === "he" ? "ניסיון תעסוקתי" : "Experience"}`, "");
    for (const e of r.experience) {
      const date = `${e.startDate ?? ""} – ${e.current ? (lang === "he" ? "היום" : "Present") : e.endDate ?? ""}`;
      out.push(
        `### ${e.title} · ${e.company}${e.location ? ` · ${e.location}` : ""}`,
        `*${date}*`,
        "",
      );
      for (const b of e.bullets ?? []) out.push(`- ${b}`);
      out.push("");
    }
  }
  if (r.education?.length) {
    out.push("", `## ${lang === "he" ? "השכלה" : "Education"}`, "");
    for (const ed of r.education) {
      const meta = [ed.degree, ed.field].filter(Boolean).join(", ");
      const date = ed.startDate || ed.endDate ? ` *(${ed.startDate ?? ""} – ${ed.endDate ?? ""})*` : "";
      out.push(`- **${ed.institution}**${meta ? ` — ${meta}` : ""}${date}`);
    }
  }
  if (r.certifications?.length) {
    out.push("", `## ${lang === "he" ? "הסמכות" : "Certifications"}`, "");
    for (const c of r.certifications) {
      out.push(
        `- **${c.name}**${c.issuer ? `, ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`,
      );
    }
  }
  if (r.projects?.length) {
    out.push("", `## ${lang === "he" ? "פרויקטים" : "Projects"}`, "");
    for (const p of r.projects) {
      out.push(
        `- **${p.name}**${p.description ? ` — ${p.description}` : ""}${
          p.url ? ` ([link](${p.url}))` : ""
        }`,
      );
    }
  }
  if (r.languages?.length) {
    out.push("", `## ${lang === "he" ? "שפות" : "Languages"}`, "");
    out.push(
      r.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", "),
    );
  }
  return out.join("\n");
}

export function coverLetterToHtml(
  text: string,
  lang: "he" | "en",
  title: string,
  company: string,
): string {
  const dir = lang === "he" ? "rtl" : "ltr";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${title} — ${company}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 680px; margin: 48px auto; color: #1a1a1a; line-height: 1.7; font-size: 15px; direction: ${dir}; }
  p { margin: 0 0 0.75em; }
  h2 { font-size: 1rem; color: #555; font-weight: normal; margin-bottom: 2em; }
  @media print { body { margin: 24px; } }
</style>
</head>
<body>
<h2>${title} · ${company}</h2>
${escaped}
</body>
</html>`;
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
