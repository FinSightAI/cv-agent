"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Send,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  User,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";
import { store, type StoredJob } from "@/lib/storage";
import type { ParsedResume } from "@/lib/ai/schemas";
import type { Key } from "@/lib/i18n/dictionary";

type Stage = "hr_screen" | "technical" | "behavioral" | "final_round";

type EvalDimension = {
  name: string;
  score: number;
  feedback: string;
  improvement: string;
};

type ModelAnswer = {
  question: string;
  candidateAnswer?: string;
  idealAnswer: string;
};

type EvalResult = {
  overallScore: number;
  recommendation: "strong_yes" | "yes" | "maybe" | "no";
  summary: string;
  dimensions: EvalDimension[];
  strongMoments: string[];
  weakMoments: string[];
  modelAnswers: ModelAnswer[];
};

type MessagePart = { type: string; text?: string };

const STAGE_KEYS: Record<Stage, Key> = {
  hr_screen: "sim.stage.hr_screen",
  technical: "sim.stage.technical",
  behavioral: "sim.stage.behavioral",
  final_round: "sim.stage.final_round",
};

const REC_COLORS: Record<EvalResult["recommendation"], string> = {
  strong_yes: "bg-green-500/15 text-green-400 border-green-500/30",
  yes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  maybe: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  no: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function SimulatePage() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<StoredJob | null>(null);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [stage, setStage] = useState<Stage>("technical");
  const [input, setInput] = useState("");
  const [ending, setEnding] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const j = store.getJob(id);
    if (!j) {
      toast.error(t("sim.noJob"));
      router.replace("/jobs");
      return;
    }
    setJob(j);
    const r = store.getResume();
    setResume(r?.parsed ?? null);
  }, [id, router, t]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/interview/simulate",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          resume: resume ?? {},
          job: job?.parsed ?? { title: "", company: "" },
          stage,
          language: lang,
        },
      }),
    }),
  });

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  function handleSend() {
    const value = input.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  }

  function handleRestart() {
    setMessages([]);
    setEvalResult(null);
    setInput("");
  }

  async function handleEndInterview() {
    if (!job || messages.length < 2) {
      toast.error("הוסף לפחות תשובה אחת לפני סיום הראיון");
      return;
    }
    setEnding(true);
    try {
      const transcript = messages
        .map((m) => {
          const role = m.role === "user" ? t("sim.you") : t("sim.interviewer");
          const text = (m.parts as MessagePart[])
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("");
          return `${role}: ${text}`;
        })
        .join("\n\n");

      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          resume: resume ?? {},
          job: job.parsed,
        }),
      });
      if (res.status === 429) throw new Error(t("error.rateLimit"));
      if (!res.ok) throw new Error("הערכה נכשלה");
      const data = await res.json();
      setEvalResult(data.result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnding(false);
    }
  }

  if (!job) return null;

  // Show evaluation results
  if (evalResult) {
    return (
      <EvalView
        result={evalResult}
        job={job}
        onRestart={handleRestart}
        t={t}
      />
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-10 space-y-4 flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100dvh-2rem)]">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="size-6 text-primary shrink-0" />
              {t("sim.title")}
            </h1>
            <p className="text-muted-foreground text-sm truncate">
              {job.parsed.title} · {job.parsed.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {!resume && (
            <span className="text-xs text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
              {t("sim.noResume")}
            </span>
          )}
          <Select value={stage} onValueChange={(v) => setStage(v as Stage)} disabled={messages.length > 0}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STAGE_KEYS) as Stage[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(STAGE_KEYS[s])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {messages.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleRestart} disabled={busy || ending}>
              <RotateCcw className="size-3.5 me-1" />
              {t("sim.restart")}
            </Button>
          )}
          {messages.length >= 2 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndInterview}
              disabled={busy || ending}
            >
              {ending ? (
                <>
                  <Loader2 className="size-3.5 me-1 animate-spin" />
                  {t("sim.ending")}
                </>
              ) : (
                t("sim.end")
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Chat */}
      <Card className="glass flex-1 flex flex-col min-h-0">
        <CardContent
          ref={scrollerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 py-12">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-slate-700/40 to-slate-600/20 grid place-items-center border border-border/50 shadow-lg">
                <Briefcase className="size-10 text-foreground/60" />
              </div>
              <div className="text-center max-w-sm space-y-2">
                <p className="font-semibold text-lg">{t("sim.title")}</p>
                <p className="text-sm text-muted-foreground">{t("sim.subtitle")}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("sim.stage.technical") === t(STAGE_KEYS[stage])
                    ? ""
                    : t(STAGE_KEYS[stage])}
                </p>
                <Button
                  onClick={() => {
                    if (!resume) {
                      toast.error(t("sim.noResume"));
                      return;
                    }
                    sendMessage({ text: "__start__" });
                  }}
                  size="lg"
                  className="gap-2"
                  disabled={busy}
                >
                  <Mic className="size-4" />
                  {t("sim.start")} — {t(STAGE_KEYS[stage])}
                </Button>
              </div>
            </div>
          )}

          {messages
            .filter((m) => {
              // Hide the hidden start trigger message
              const text = (m.parts as MessagePart[])
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("");
              return !(m.role === "user" && text === "__start__");
            })
            .map((m) => (
              <InterviewMessage
                key={m.id}
                role={m.role}
                parts={m.parts as MessagePart[]}
                interviewerLabel={t("sim.interviewer")}
                youLabel={t("sim.you")}
              />
            ))}

          {status === "submitted" && (
            <div className="flex gap-3">
              <div className="size-9 rounded-lg bg-muted/50 border border-border/50 grid place-items-center shrink-0">
                <Briefcase className="size-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1 pt-2.5">
                <span className="size-2 rounded-full bg-foreground/30 animate-pulse" />
                <span
                  className="size-2 rounded-full bg-foreground/30 animate-pulse"
                  style={{ animationDelay: "200ms" }}
                />
                <span
                  className="size-2 rounded-full bg-foreground/30 animate-pulse"
                  style={{ animationDelay: "400ms" }}
                />
              </div>
            </div>
          )}
        </CardContent>

        {messages.length > 0 && (
          <div className="border-t border-border/50 p-3 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2 items-end"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t("sim.typeAnswer")}
                rows={2}
                className="min-h-[52px] max-h-36 resize-none flex-1 text-sm"
                disabled={busy || ending}
                dir="auto"
              />
              <Button
                type="submit"
                disabled={busy || ending || !input.trim()}
                size="icon"
                className="h-[52px] w-10 shrink-0"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}

function InterviewMessage({
  role,
  parts,
  interviewerLabel,
  youLabel,
}: {
  role: string;
  parts: MessagePart[];
  interviewerLabel: string;
  youLabel: string;
}) {
  const isUser = role === "user";
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");

  if (!text) return null;

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
          <User className="size-4 text-primary" />
        </div>
        <div className="max-w-[78%] space-y-0.5">
          <p className="text-[10px] text-muted-foreground text-end pe-1">{youLabel}</p>
          <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm bg-primary text-primary-foreground leading-relaxed">
            {text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="size-9 rounded-lg bg-muted/50 border border-border/50 grid place-items-center shrink-0">
        <Briefcase className="size-4 text-foreground/60" />
      </div>
      <div className="max-w-[78%] space-y-0.5">
        <p className="text-[10px] text-muted-foreground ps-1">{interviewerLabel}</p>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-muted/40 border border-border/40 leading-relaxed">
          {text}
        </div>
      </div>
    </div>
  );
}

function EvalView({
  result,
  job,
  onRestart,
  t,
}: {
  result: EvalResult;
  job: StoredJob;
  onRestart: () => void;
  t: (key: Key) => string;
}) {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());

  function toggleAnswer(i: number) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const recColor = REC_COLORS[result.recommendation];
  const recLabel = t(`sim.rec.${result.recommendation}` as Key);

  const scoreColor =
    result.overallScore >= 75
      ? "text-green-400"
      : result.overallScore >= 50
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-10 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="size-6 text-primary" />
            {t("sim.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {job.parsed.title} · {job.parsed.company}
          </p>
        </div>
        <Button variant="outline" onClick={onRestart} size="sm">
          <RotateCcw className="size-3.5 me-1" />
          {t("sim.restart")}
        </Button>
      </header>

      {/* Score hero */}
      <Card className="glass">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center shrink-0">
              <div className={`text-7xl font-bold tabular-nums ${scoreColor}`}>
                {result.overallScore}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t("sim.score")}</div>
            </div>
            <div className="flex-1 min-w-[200px] space-y-3">
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${recColor}`}
                >
                  {recLabel}
                </div>
              </div>
              <Progress value={result.overallScore} className="h-2" />
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimensions */}
      {result.dimensions.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("sim.dimensions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.dimensions.map((d, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {d.score}/10
                  </span>
                </div>
                <Progress value={d.score * 10} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{d.feedback}</p>
                {d.improvement && (
                  <p className="text-xs text-amber-400/80">
                    <span className="font-medium">שיפור: </span>
                    {d.improvement}
                  </p>
                )}
                {i < result.dimensions.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strong / Weak moments */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.strongMoments.length > 0 && (
          <Card className="glass border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-400">
                <CheckCircle2 className="size-4" />
                {t("sim.strongMoments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.strongMoments.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-green-400 shrink-0 mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {result.weakMoments.length > 0 && (
          <Card className="glass border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                <AlertTriangle className="size-4" />
                {t("sim.weakMoments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.weakMoments.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">-</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Model answers */}
      {result.modelAnswers.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("sim.modelAnswers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.modelAnswers.map((a, i) => (
              <div key={i} className="border border-border/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-muted/20 transition-colors"
                  onClick={() => toggleAnswer(i)}
                >
                  <span className="text-sm font-medium leading-snug">{a.question}</span>
                  {expandedAnswers.has(i) ? (
                    <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedAnswers.has(i) && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                    {a.candidateAnswer && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("sim.candidateAnswer")}
                        </p>
                        <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground leading-relaxed">
                          {a.candidateAnswer}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                        {t("sim.idealAnswer")}
                      </p>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm leading-relaxed">
                        {a.idealAnswer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
