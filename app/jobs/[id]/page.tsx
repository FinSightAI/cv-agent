"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Copy,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Download,
  Wand2,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
} from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import type {
  CVSuggestion,
  CVSuggestions,
  InterviewPrep,
  InterviewQuestion,
  MatchResult,
  ParsedResume,
  TailoredResume,
} from "@/lib/ai/schemas";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { PrintableResume } from "@/components/printable-resume";
import { downloadMarkdown, resumeToMarkdown } from "@/lib/cv-export";
import { AILoadingSkeleton } from "@/components/ai-loading-skeleton";
import { aiFetchJson, formatDate } from "@/lib/utils";

const STATUSES: StoredJob["status"][] = [
  "saved",
  "drafting",
  "ready",
  "applied",
  "screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "ghosted",
];

export default function JobDetailPage() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<StoredJob | null>(null);
  const [matching, setMatching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] =
    useState<"professional" | "warm" | "concise" | "enthusiastic">(
      "professional",
    );
  const [language, setLanguage] = useState<"he" | "en">("he");
  const [notes, setNotes] = useState("");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const j = store.getJob(id);
    if (!j) {
      toast.error(t("job.notFound"));
      router.replace("/jobs");
      return;
    }
    setJob(j);
    if (j.coverLetter) setLetter(j.coverLetter);
    if (j.notes) setNotes(j.notes);
  }, [id, router, t]);

  function handleNotesChange(val: string) {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (!job) return;
      const updated = { ...job, notes: val };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("job.notes.saved"), { duration: 1500 });
    }, 1200);
  }

  async function runMatch() {
    if (!job) return;
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("job.match.noResume"));
      router.push("/cv");
      return;
    }
    setMatching(true);
    try {
      const { result } = await aiFetchJson<{ result: MatchResult }>(
        "/api/match",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
        },
        { t, fallback: t("job.match.failed") },
      );
      const updated = { ...job, match: result };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("job.match.success"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setMatching(false);
    }
  }

  async function generateLetter() {
    if (!job) return;
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("job.match.noResume"));
      return;
    }
    setGenerating(true);
    setLetter("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.parsed,
          job: job.parsed,
          tone,
          language,
          feedback: feedback.trim() || undefined,
        }),
      });
      if (res.status === 429) throw new Error(t("error.rateLimit"));
      if (!res.ok || !res.body) throw new Error(t("job.letter.failed"));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setLetter(acc);
      }
      const updated = { ...job, coverLetter: acc };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("job.letter.ready"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function setStatus(status: StoredJob["status"]) {
    if (!job) return;
    const updated: StoredJob = {
      ...job,
      status,
      appliedAt:
        status === "applied" && !job.appliedAt
          ? new Date().toISOString()
          : job.appliedAt,
    };
    store.saveJob(updated);
    setJob(updated);
    toast.success(t("status.update"));
  }

  function deleteJob() {
    if (!job) return;
    if (!confirm(t("status.deleteConfirm"))) return;
    store.deleteJob(job.id);
    router.replace("/jobs");
  }

  if (!job) return null;

  const { parsed, match } = job;

  return (
    <div className="container max-w-5xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl font-bold">{parsed.title}</h1>
          <p className="text-muted-foreground">
            {parsed.company}
            {parsed.location ? ` · ${parsed.location}` : ""}
            {parsed.remote ? ` · ${t("job.remote")}` : ""}
          </p>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              dir="ltr"
            >
              <ExternalLink className="size-3" />
              {job.url}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={job.status} onValueChange={(v) => setStatus(v as StoredJob["status"])}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as Key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={deleteJob}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Applied date */}
      {job.appliedAt && (
        <p className="text-xs text-muted-foreground">
          {t("job.appliedAt")} {formatDate(job.appliedAt, lang)}
        </p>
      )}

      {/* Notes — auto-save */}
      <div className="print-hide">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={t("job.notes.placeholder")}
          className="text-sm bg-muted/20 resize-none"
          dir="auto"
        />
        <p className="text-[10px] text-muted-foreground mt-1">{t("job.notes")}</p>
      </div>

      <Tabs defaultValue="match" className="print-hide">
        <TabsList>
          <TabsTrigger value="match">{t("job.tab.match")}</TabsTrigger>
          <TabsTrigger value="suggest">{t("job.tab.suggest")}</TabsTrigger>
          <TabsTrigger value="tailor">{t("job.tab.tailor")}</TabsTrigger>
          <TabsTrigger value="letter">{t("job.tab.letter")}</TabsTrigger>
          <TabsTrigger value="details">{t("job.tab.details")}</TabsTrigger>
          <TabsTrigger value="interview">{t("job.tab.interview")}</TabsTrigger>
        </TabsList>

        <TabsContent value="match" className="pt-4 space-y-4">
          {matching && !match ? (
            <AILoadingSkeleton kind="match" />
          ) : !match ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("job.match.title")}</CardTitle>
                <CardDescription>{t("job.match.desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runMatch} disabled={matching}>
                  <Sparkles className="size-4 me-2" />
                  {t("job.match.run")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <MatchView match={match} onRefresh={runMatch} loading={matching} />
          )}
        </TabsContent>

        <TabsContent value="suggest" className="pt-4 space-y-4">
          <SuggestTab job={job} setJob={setJob} />
        </TabsContent>

        <TabsContent value="tailor" className="pt-4 space-y-4">
          <TailorTab job={job} setJob={setJob} />
        </TabsContent>

        <TabsContent value="letter" className="pt-4 space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{t("job.letter.title")}</CardTitle>
              <CardDescription>{t("job.letter.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("job.letter.language")}
                  </label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "he" | "en")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">עברית</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("job.letter.tone")}
                  </label>
                  <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">{t("job.letter.tone.professional")}</SelectItem>
                      <SelectItem value="warm">{t("job.letter.tone.warm")}</SelectItem>
                      <SelectItem value="concise">{t("job.letter.tone.concise")}</SelectItem>
                      <SelectItem value="enthusiastic">{t("job.letter.tone.enthusiastic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {letter && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("job.letter.feedback")}
                  </label>
                  <Textarea
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t("job.letter.feedback.placeholder")}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={generateLetter} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="size-4 me-2 animate-spin" />
                      {t("job.letter.writing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 me-2" />
                      {letter ? t("job.letter.regenerate") : t("job.letter.create")}
                    </>
                  )}
                </Button>
                {letter && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(letter);
                      toast.success(t("common.copied"));
                    }}
                  >
                    <Copy className="size-4 me-2" />
                    {t("common.copy")}
                  </Button>
                )}
              </div>
              {generating && !letter && <AILoadingSkeleton kind="letter" />}
              {letter && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="pt-6 whitespace-pre-wrap text-sm leading-relaxed">
                    {letter}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="pt-4 space-y-4">
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
          {parsed.requirements && parsed.requirements.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">{t("job.details.requirements")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {parsed.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant={r.required ? "default" : "secondary"} className="shrink-0">
                        {r.required ? t("job.details.required") : t("job.details.preferred")}
                      </Badge>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {parsed.responsibilities && parsed.responsibilities.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">{t("job.details.responsibilities")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc ps-5 text-sm space-y-1">
                  {parsed.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {parsed.techStack && parsed.techStack.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">{t("job.details.techStack")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {parsed.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="interview" className="pt-4 space-y-4">
          <InterviewTab job={job} setJob={setJob} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TailorTab({
  job,
  setJob,
}: {
  job: StoredJob;
  setJob: React.Dispatch<React.SetStateAction<StoredJob | null>>;
}) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const tailored = job.tailoredResume;

  async function generate() {
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("tailor.noResume"));
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: TailoredResume }>(
        "/api/cv/tailor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: resume.parsed,
            job: job.parsed,
            feedback: feedback.trim() || undefined,
          }),
        },
        { t, fallback: t("tailor.failed") },
      );
      const updated: StoredJob = { ...job, tailoredResume: data.result };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("tailor.success"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!tailored) {
    if (busy) return <AILoadingSkeleton kind="tailor" />;
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("tailor.title")}</CardTitle>
          <CardDescription>{t("tailor.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={busy}>
            <Wand2 className="size-4 me-2" />
            {t("tailor.run")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const filename = `${job.parsed.company}-${job.parsed.title}`
    .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{t("tailor.title")}</CardTitle>
              <CardDescription>{t("tailor.desc")}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4 me-1" />
                {t("tailor.print")}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("tailor.feedback")}</label>
            <Textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t("tailor.feedback.placeholder")}
            />
          </div>
          <Button onClick={generate} disabled={busy} variant="secondary">
            {busy ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t("tailor.tailoring")}
              </>
            ) : (
              <>
                <Wand2 className="size-4 me-2" />
                {t("tailor.regenerate")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <ChangesCard tailored={tailored} />

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t("tailor.preview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="print-root">
            <PrintableResume resume={tailored.resume} lang={lang} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChangesCard({ tailored }: { tailored: TailoredResume }) {
  const { t } = useLang();
  if (!tailored.changes || tailored.changes.length === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t("tailor.changes")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("tailor.changes.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">{t("tailor.changes")}</CardTitle>
        {tailored.notes && (
          <CardDescription className="text-xs">{tailored.notes}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {tailored.changes.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {t(`tailor.kind.${c.kind}` as Key)}
            </Badge>
            <div>
              <div className="font-medium">{c.section}</div>
              <div className="text-muted-foreground text-xs">{c.change}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MatchView({
  match,
  onRefresh,
  loading,
}: {
  match: MatchResult;
  onRefresh: () => void;
  loading: boolean;
}) {
  const { t } = useLang();
  const recColor =
    match.recommendation === "apply"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : match.recommendation === "tailor_first"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";
  const recLabel =
    match.recommendation === "apply"
      ? t("job.match.rec.apply")
      : match.recommendation === "tailor_first"
      ? t("job.match.rec.tailor")
      : t("job.match.rec.skip");

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-4xl">{match.score}/100</CardTitle>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${recColor}`}>
                {t("job.match.recommendation")}: {recLabel}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 me-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 me-2" />
              )}
              {t("job.match.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={match.score} />
          <p className="text-sm">{match.reason}</p>
          <div className="flex items-center gap-2 text-sm">
            {match.hardRequirementsMet ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <XCircle className="size-4 text-red-500" />
            )}
            {t("job.match.hardReq")}:{" "}
            {match.hardRequirementsMet
              ? t("job.match.hardReqMet")
              : t("job.match.hardReqMissing")}
          </div>
        </CardContent>
      </Card>

      {match.strengths.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-500" />
              {t("job.match.strengths")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ps-5 text-sm space-y-1">
              {match.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {match.gaps.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              {t("job.match.gaps")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {match.gaps.map((g, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-start gap-2">
                  <Badge
                    variant={
                      g.severity === "blocker"
                        ? "destructive"
                        : g.severity === "major"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {t(`job.match.severity.${g.severity}` as Key)}
                  </Badge>
                  <span>{g.requirement}</span>
                </div>
                {g.mitigation && (
                  <p className="text-muted-foreground mt-1 ps-16 text-xs">💡 {g.mitigation}</p>
                )}
                {i < match.gaps.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {match.suggestedResumeEdits.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("job.match.editsTitle")}</CardTitle>
            <CardDescription>{t("job.match.editsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {match.suggestedResumeEdits.map((e, i) => (
              <div key={i}>
                <div className="font-medium">{e.section}</div>
                <div className="text-muted-foreground">{e.change}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {match.keywordsToAdd.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("job.match.keywords")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {match.keywordsToAdd.map((k) => (
              <Badge key={k} variant="outline">
                {k}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SuggestTab({
  job,
  setJob,
}: {
  job: StoredJob;
  setJob: React.Dispatch<React.SetStateAction<StoredJob | null>>;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const suggestions = job.suggestions;

  async function generate() {
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("suggest.noResume"));
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: CVSuggestions }>(
        "/api/cv/suggestions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
        },
        { t, fallback: t("suggest.failed") },
      );
      const updated: StoredJob = { ...job, suggestions: data.result };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("suggest.success"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!suggestions) {
    if (busy) return <AILoadingSkeleton kind="match" />;
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("suggest.title")}</CardTitle>
          <CardDescription>{t("suggest.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={busy}>
            <Lightbulb className="size-4 me-2" />
            {t("suggest.run")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const byPriority: Record<"high" | "medium" | "low", CVSuggestion[]> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const s of suggestions.suggestions) byPriority[s.priority].push(s);

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-400" />
                {t("suggest.overallNote")}
              </CardTitle>
              <CardDescription>{suggestions.overallNote}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={generate} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 me-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 me-2" />
              )}
              {t("suggest.regenerate")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {suggestions.suggestions.length === 0 && (
        <Card className="glass">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("suggest.empty")}
          </CardContent>
        </Card>
      )}

      {(["high", "medium", "low"] as const).map((p) => {
        const list = byPriority[p];
        if (list.length === 0) return null;
        return (
          <div key={p} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`suggest.priority.${p}` as Key)} · {list.length}
            </h3>
            {list.map((s, i) => (
              <SuggestionCard key={`${p}-${i}`} s={s} />
            ))}
          </div>
        );
      })}

      {suggestions.strengthsToEmphasize.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("suggest.strengths")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {suggestions.strengthsToEmphasize.map((s, i) => (
              <Badge key={i} variant="secondary">
                {s}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {suggestions.missingKeywords.length > 0 && (
        <Card className="glass border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400" />
              {t("suggest.missingKeywords")}
            </CardTitle>
            <CardDescription>
              {t("suggest.missingKeywords.hint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {suggestions.missingKeywords.map((k) => (
              <Badge key={k} variant="outline">
                {k}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SuggestionCard({ s }: { s: CVSuggestion }) {
  const { t } = useLang();
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">{t(`suggest.type.${s.type}` as Key)}</Badge>
          <Badge variant="outline">{t(`suggest.section.${s.section}` as Key)}</Badge>
          <span className="text-xs text-muted-foreground">{s.target}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {s.currentText && (
          <div className="grid gap-2 md:grid-cols-[auto_1fr_auto_1fr] items-start">
            <span className="text-xs text-muted-foreground pt-1">
              {t("suggest.currentLabel")}
            </span>
            <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 line-through opacity-70">
              {s.currentText}
            </div>
            <ArrowRight className="size-4 text-muted-foreground hidden md:block mt-2" />
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              {s.suggestedText}
            </div>
          </div>
        )}
        {!s.currentText && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            {s.suggestedText}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{t("suggest.reasonLabel")}: </span>
          {s.reason}
        </p>
        {s.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.matchedKeywords.map((k) => (
              <Badge key={k} variant="secondary" className="text-[10px]">
                {k}
              </Badge>
            ))}
          </div>
        )}
        <div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(s.suggestedText);
              toast.success(t("common.copied"));
            }}
          >
            <Copy className="size-3 me-1.5" />
            {t("suggest.copySuggested")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewTab({
  job,
  setJob,
}: {
  job: StoredJob;
  setJob: React.Dispatch<React.SetStateAction<StoredJob | null>>;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const prep = job.interviewPrep;

  async function generate() {
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("interview.noResume"));
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: InterviewPrep }>(
        "/api/interview/questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
        },
        { t, fallback: t("interview.failed") },
      );
      const updated: StoredJob = { ...job, interviewPrep: data.result };
      store.saveJob(updated);
      setJob(updated);
      toast.success(t("interview.success"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!prep) {
    if (busy) return <AILoadingSkeleton kind="match" />;
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("interview.title")}</CardTitle>
          <CardDescription>{t("interview.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={busy}>
            <BrainCircuit className="size-4 me-2" />
            {t("interview.run")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const byCategory = prep.questions.reduce<Record<string, InterviewQuestion[]>>(
    (acc, q) => {
      (acc[q.category] ??= []).push(q);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="size-4 text-primary" />
                {t("interview.title")} · {prep.questions.length} {t("interview.count")}
              </CardTitle>
              {prep.prepNotes && (
                <CardDescription>{prep.prepNotes}</CardDescription>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={generate} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 me-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 me-2" />
              )}
              {t("interview.regenerate")}
            </Button>
          </div>
        </CardHeader>
        {prep.keyThemes.length > 0 && (
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">{t("interview.keyThemes")}</p>
            <div className="flex flex-wrap gap-2">
              {prep.keyThemes.map((theme) => (
                <Badge key={theme} variant="secondary">
                  {theme}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {(["behavioral", "technical", "situational", "role_specific", "company_culture"] as const).map((cat) => {
        const qs = byCategory[cat];
        if (!qs || qs.length === 0) return null;
        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`interview.category.${cat}` as Key)} · {qs.length}
            </h3>
            {qs.map((q, i) => (
              <InterviewQuestionCard key={`${cat}-${i}`} q={q} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function InterviewQuestionCard({ q }: { q: InterviewQuestion }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const diffColor =
    q.difficulty === "hard"
      ? "bg-red-500/15 text-red-400 border-red-500/30"
      : q.difficulty === "medium"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-green-500/15 text-green-400 border-green-500/30";

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-snug">{q.question}</p>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${diffColor}`}>
            {t(`interview.difficulty.${q.difficulty}` as Key)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              <ChevronUp className="size-3 me-1" />
              {t("interview.hideAnswer")}
            </>
          ) : (
            <>
              <ChevronDown className="size-3 me-1" />
              {t("interview.showAnswer")}
            </>
          )}
        </Button>
        {open && (
          <div className="space-y-3">
            <div className="rounded-md bg-muted/40 px-4 py-3 text-sm leading-relaxed">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {t("interview.suggestedAnswer")}
              </p>
              {q.suggestedAnswer}
            </div>
            {q.tips && q.tips.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("interview.tips")}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ps-4 list-disc">
                  {q.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(q.suggestedAnswer);
                toast.success(t("common.copied"));
              }}
            >
              <Copy className="size-3 me-1.5" />
              {t("common.copy")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
