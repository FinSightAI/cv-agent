"use client";

import type { ParsedResume } from "@/lib/ai/schemas";
import { dictionary, type Lang } from "@/lib/i18n/dictionary";

// Print-optimized resume. A4-friendly margins, monochrome, web-safe fonts.
// Use with media print rules so chrome (sidebar/buttons) hides on print.
export function PrintableResume({
  resume,
  lang,
}: {
  resume: ParsedResume;
  lang: Lang;
}) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const t = (k: keyof (typeof dictionary)["he"]) => dictionary[lang][k];
  const todayStr = t("resume.present");

  return (
    <article
      dir={dir}
      className="printable-resume bg-white text-black mx-auto p-10 shadow-lg max-w-[820px]"
      style={{ minHeight: "1100px", fontFamily: "var(--font-sans)" }}
    >
      <header className="border-b border-black/30 pb-3 mb-4">
        <h1 className="text-3xl font-bold">{resume.fullName ?? ""}</h1>
        {resume.headline && (
          <p className="text-base text-black/70 mt-1">{resume.headline}</p>
        )}
        <div className="text-xs text-black/70 flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {resume.email && <span>{resume.email}</span>}
          {resume.phone && <span>{resume.phone}</span>}
          {resume.location && <span>{resume.location}</span>}
          {resume.links?.map((l) => (
            <span key={l.url}>
              <a href={l.url} className="underline">
                {l.label || l.url}
              </a>
            </span>
          ))}
        </div>
      </header>

      {resume.summary && (
        <Section title={t("resume.section.summary")}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {resume.summary}
          </p>
        </Section>
      )}

      {resume.skills && resume.skills.length > 0 && (
        <Section title={t("resume.section.skills")}>
          <p className="text-sm leading-relaxed">
            {resume.skills.join(" · ")}
          </p>
        </Section>
      )}

      {resume.experience && resume.experience.length > 0 && (
        <Section title={t("resume.section.experience")}>
          <div className="space-y-3">
            {resume.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-semibold text-sm">
                    {exp.title} · {exp.company}
                    {exp.location ? <span className="font-normal text-black/60"> · {exp.location}</span> : null}
                  </div>
                  <div className="text-xs text-black/60 shrink-0">
                    {exp.startDate ?? ""} – {exp.current ? todayStr : exp.endDate ?? ""}
                  </div>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc ps-5 text-sm space-y-0.5 mt-1">
                    {exp.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.education && resume.education.length > 0 && (
        <Section title={t("resume.section.education")}>
          <div className="space-y-2">
            {resume.education.map((ed, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 flex-wrap text-sm">
                <div>
                  <span className="font-medium">{ed.institution}</span>
                  <span className="text-black/60">
                    {[ed.degree, ed.field].filter(Boolean).length > 0
                      ? ` — ${[ed.degree, ed.field].filter(Boolean).join(", ")}`
                      : ""}
                  </span>
                </div>
                <div className="text-xs text-black/60 shrink-0">
                  {ed.startDate ?? ""} – {ed.endDate ?? ""}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.certifications && resume.certifications.length > 0 && (
        <Section title={t("resume.section.certifications")}>
          <ul className="list-disc ps-5 text-sm space-y-0.5">
            {resume.certifications.map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.name}</span>
                {c.issuer ? `, ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <Section title={t("resume.section.projects")}>
          <ul className="list-disc ps-5 text-sm space-y-0.5">
            {resume.projects.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.name}</span>
                {p.description ? ` — ${p.description}` : ""}
                {p.url ? (
                  <>
                    {" "}
                    <a className="underline" href={p.url}>
                      {p.url}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resume.languages && resume.languages.length > 0 && (
        <Section title={t("resume.section.languages")}>
          <p className="text-sm">
            {resume.languages
              .map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`)
              .join(" · ")}
          </p>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-black/70 border-b border-black/20 pb-0.5 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
