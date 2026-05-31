"use client";

import { useEffect, useRef, useState } from "react";
import { store } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Sparkles, Pencil, X, Check, Plus } from "lucide-react";
import type { ParsedResume } from "@/lib/ai/schemas";
import { useLang } from "@/components/lang-provider";
import { LinkedInOptimizer } from "@/components/linkedin-optimizer";

function cvCompleteness(p: ParsedResume): number {
  let score = 0;
  if (p.fullName) score += 10;
  if (p.headline) score += 10;
  if (p.email) score += 10;
  if (p.summary && p.summary.length > 30) score += 15;
  if (p.skills && p.skills.length >= 3) score += 15;
  if (p.experience && p.experience.length > 0) score += 20;
  if (p.experience?.some((e) => e.bullets && e.bullets.length > 0)) score += 10;
  if (p.education && p.education.length > 0) score += 10;
  return score;
}

export default function CVPage() {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    const stored = store.getResume();
    if (stored) {
      setParsed(stored.parsed);
      setRawText(stored.rawText);
    }
  }, []);

  async function handleParse() {
    if (!file && !text.trim()) {
      toast.error(t("cv.uploadError"));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      else fd.append("text", text);
      const res = await fetch("/api/cv/parse", { method: "POST", body: fd });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error(error);
      }
      const data = await res.json();
      setParsed(data.parsed);
      setRawText(data.rawText);
      store.setResume({
        parsed: data.parsed,
        rawText: data.rawText,
        updatedAt: new Date().toISOString(),
      });
      toast.success(t("cv.parsedSuccess"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleSaveEdits(updated: ParsedResume) {
    const stored = store.getResume();
    store.setResume({
      parsed: updated,
      rawText: stored?.rawText ?? rawText,
      updatedAt: new Date().toISOString(),
    });
    setParsed(updated);
    toast.success(t("cv.editSaved"));
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 lg:p-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">{t("cv.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("cv.subtitle")}</p>
      </header>

      {!parsed ? (
        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("cv.upload.title")}</CardTitle>
            <CardDescription>{t("cv.upload.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file">
              <TabsList>
                <TabsTrigger value="file">{t("cv.tab.file")}</TabsTrigger>
                <TabsTrigger value="text">{t("cv.tab.text")}</TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="space-y-4 pt-4">
                <Label
                  htmlFor="cv-file"
                  className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="size-14 rounded-full bg-primary/10 grid place-items-center">
                    <Upload className="size-6 text-primary" />
                  </div>
                  <span className="text-sm">
                    {file ? file.name : t("cv.dropzone")}
                  </span>
                  <Input
                    id="cv-file"
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </Label>
              </TabsContent>
              <TabsContent value="text" className="pt-4">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("cv.paste.placeholder")}
                  rows={14}
                />
              </TabsContent>
            </Tabs>
            <div className="flex justify-end pt-4">
              <Button onClick={handleParse} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 me-2 animate-spin" />
                    {t("cv.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 me-2" />
                    {t("cv.analyze")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ResumeView
          parsed={parsed}
          rawText={rawText}
          onReset={() => setParsed(null)}
          onSave={handleSaveEdits}
        />
      )}
    </div>
  );
}

function ResumeView({
  parsed,
  rawText,
  onReset,
  onSave,
}: {
  parsed: ParsedResume;
  rawText: string;
  onReset: () => void;
  onSave: (updated: ParsedResume) => void;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParsedResume>(parsed);
  const score = cvCompleteness(parsed);

  function startEdit() {
    setDraft(structuredClone(parsed));
    setEditing(true);
  }

  function discard() {
    setEditing(false);
    setDraft(parsed);
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            {t("cv.analyzedAt")} · {rawText.length.toLocaleString()} {t("cv.chars")}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("cv.completeScore")}</span>
            <Progress value={score} className="w-20 h-1.5" />
            <span className="text-xs font-medium">{score}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={save}>
                <Check className="size-4 me-1.5" />
                {t("cv.saveEdits")}
              </Button>
              <Button size="sm" variant="outline" onClick={discard}>
                <X className="size-4 me-1.5" />
                {t("cv.discardEdits")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil className="size-4 me-1.5" />
                {t("cv.edit")}
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                {t("cv.uploadAnother")}
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <EditView draft={draft} setDraft={setDraft} />
      ) : (
        <ReadView parsed={parsed} />
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t("cv.localStorageNote")}
      </p>

      <LinkedInOptimizer />
    </div>
  );
}

function ReadView({ parsed }: { parsed: ParsedResume }) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle>{parsed.fullName ?? "—"}</CardTitle>
          {parsed.headline && <CardDescription>{parsed.headline}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {parsed.email && <div>📧 {parsed.email}</div>}
          {parsed.phone && <div>📞 {parsed.phone}</div>}
          {parsed.location && <div>📍 {parsed.location}</div>}
          {parsed.links?.map((l) => (
            <div key={l.url}>
              🔗{" "}
              <a className="underline hover:text-primary transition-colors" href={l.url} target="_blank" rel="noreferrer">
                {l.label || l.url}
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {parsed.summary && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
            {parsed.summary}
          </CardContent>
        </Card>
      )}

      {parsed.skills && parsed.skills.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.skills")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {parsed.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed.experience && parsed.experience.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.experience")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsed.experience.map((exp, i) => (
              <div key={i} className="space-y-1">
                <div className="font-medium">
                  {exp.title} · {exp.company}
                </div>
                <div className="text-xs text-muted-foreground">
                  {exp.startDate ?? "?"} –{" "}
                  {exp.current ? t("cv.today") : exp.endDate ?? "?"}
                  {exp.location ? ` · ${exp.location}` : ""}
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc ps-5 text-sm space-y-1 mt-2">
                    {exp.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
                {i < parsed.experience!.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed.education && parsed.education.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.education")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {parsed.education.map((ed, i) => (
              <div key={i}>
                <div className="font-medium">{ed.institution}</div>
                <div className="text-xs text-muted-foreground">
                  {[ed.degree, ed.field].filter(Boolean).join(" · ")}
                  {ed.startDate || ed.endDate
                    ? ` · ${ed.startDate ?? "?"} – ${ed.endDate ?? "?"}`
                    : ""}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed.certifications && parsed.certifications.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.section.certifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {parsed.certifications.map((c, i) => (
              <div key={i}>
                <span className="font-medium">{c.name}</span>
                {c.issuer && <span className="text-muted-foreground"> · {c.issuer}</span>}
                {c.date && <span className="text-muted-foreground"> · {c.date}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {parsed.projects && parsed.projects.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.section.projects")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {parsed.projects.map((p, i) => (
              <div key={i}>
                <span className="font-medium">{p.name}</span>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-2 text-xs text-primary underline"
                  >
                    {p.url}
                  </a>
                )}
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditView({
  draft,
  setDraft,
}: {
  draft: ParsedResume;
  setDraft: React.Dispatch<React.SetStateAction<ParsedResume>>;
}) {
  const { t } = useLang();
  const skillInputRef = useRef<HTMLInputElement>(null);
  const [skillInput, setSkillInput] = useState("");

  function setField<K extends keyof ParsedResume>(key: K, value: ParsedResume[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill(skill: string) {
    const s = skill.trim();
    if (!s) return;
    const existing = draft.skills ?? [];
    if (!existing.includes(s)) {
      setField("skills", [...existing, s]);
    }
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setField("skills", (draft.skills ?? []).filter((x) => x !== s));
  }

  function updateExpBullet(expIdx: number, bulletIdx: number, val: string) {
    const exps = structuredClone(draft.experience ?? []);
    const bullets = exps[expIdx]?.bullets ?? [];
    bullets[bulletIdx] = val;
    exps[expIdx]!.bullets = bullets;
    setField("experience", exps);
  }

  function addExpBullet(expIdx: number) {
    const exps = structuredClone(draft.experience ?? []);
    exps[expIdx]!.bullets = [...(exps[expIdx]?.bullets ?? []), ""];
    setField("experience", exps);
  }

  function removeExpBullet(expIdx: number, bulletIdx: number) {
    const exps = structuredClone(draft.experience ?? []);
    exps[expIdx]!.bullets = exps[expIdx]!.bullets!.filter((_, i) => i !== bulletIdx);
    setField("experience", exps);
  }

  return (
    <div className="space-y-4">
      {/* Personal info */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">{t("cv.editMode")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("cv.field.fullName")}</Label>
            <Input
              value={draft.fullName ?? ""}
              onChange={(e) => setField("fullName", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("cv.field.headline")}</Label>
            <Input
              value={draft.headline ?? ""}
              onChange={(e) => setField("headline", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("cv.field.email")}</Label>
            <Input
              type="email"
              value={draft.email ?? ""}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("cv.field.phone")}</Label>
            <Input
              value={draft.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t("cv.field.location")}</Label>
            <Input
              value={draft.location ?? ""}
              onChange={(e) => setField("location", e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t("cv.field.summary")}</Label>
            <Textarea
              rows={4}
              value={draft.summary ?? ""}
              onChange={(e) => setField("summary", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t("cv.skills")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(draft.skills ?? []).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={() => removeSkill(s)}
              >
                {s}
                <X className="size-3" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              ref={skillInputRef}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder={t("cv.addSkill.placeholder")}
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addSkill(skillInput)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      {(draft.experience ?? []).length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("cv.experience")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(draft.experience ?? []).map((exp, ei) => (
              <div key={ei} className="space-y-3">
                {ei > 0 && <Separator />}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">תפקיד</Label>
                    <Input
                      value={exp.title}
                      onChange={(e) => {
                        const exps = structuredClone(draft.experience ?? []);
                        exps[ei]!.title = e.target.value;
                        setField("experience", exps);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">חברה</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => {
                        const exps = structuredClone(draft.experience ?? []);
                        exps[ei]!.company = e.target.value;
                        setField("experience", exps);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bullets</Label>
                  {(exp.bullets ?? []).map((b, bi) => (
                    <div key={bi} className="flex gap-2 items-start">
                      <Textarea
                        rows={2}
                        value={b}
                        onChange={(e) => updateExpBullet(ei, bi, e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 mt-1"
                        onClick={() => removeExpBullet(ei, bi)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => addExpBullet(ei)}
                  >
                    <Plus className="size-3 me-1" />
                    הוסף bullet
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
