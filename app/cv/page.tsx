"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import type { ParsedResume } from "@/lib/ai/schemas";
import { useLang } from "@/components/lang-provider";

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

  return (
    <div className="container max-w-5xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t("cv.title")}</h1>
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
        <ResumeView parsed={parsed} rawText={rawText} onReset={() => setParsed(null)} />
      )}
    </div>
  );
}

function ResumeView({
  parsed,
  rawText,
  onReset,
}: {
  parsed: ParsedResume;
  rawText: string;
  onReset: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          {t("cv.analyzedAt")} · {rawText.length.toLocaleString()} {t("cv.chars")}
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          {t("cv.uploadAnother")}
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{parsed.fullName ?? "—"}</CardTitle>
          <CardDescription>{parsed.headline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {parsed.email && <div>📧 {parsed.email}</div>}
          {parsed.phone && <div>📞 {parsed.phone}</div>}
          {parsed.location && <div>📍 {parsed.location}</div>}
          {parsed.links?.map((l) => (
            <div key={l.url}>
              🔗{" "}
              <a className="underline" href={l.url} target="_blank" rel="noreferrer">
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
          <CardContent className="text-sm whitespace-pre-wrap">
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
                  {exp.startDate ?? "?"} – {exp.current ? t("cv.today") : exp.endDate ?? "?"}
                  {exp.location ? ` · ${exp.location}` : ""}
                </div>
                {exp.bullets && (
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

      <p className="text-xs text-muted-foreground text-center">
        {t("cv.localStorageNote")}
      </p>
    </div>
  );
}
