"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type Phase = {
  theme: string;
  goals: string[];
  keyActions: string[];
  successMetric: string;
};

type PlanResult = {
  executiveSummary: string;
  firstWeekPriorities: string[];
  day30: Phase;
  day60: Phase;
  day90: Phase;
  questionsToAskInterviewer: string[];
};

function phaseToText(label: string, phase: Phase): string {
  return [
    `## ${label} — ${phase.theme}`,
    "",
    "יעדים:",
    ...phase.goals.map((g) => `- ${g}`),
    "",
    "פעולות מפתח:",
    ...phase.keyActions.map((a) => `- ${a}`),
    "",
    `מדד הצלחה: ${phase.successMetric}`,
  ].join("\n");
}

function planToText(plan: PlanResult, jobTitle?: string): string {
  return [
    `תכנית 30-60-90 יום${jobTitle ? ` — ${jobTitle}` : ""}`,
    "=".repeat(50),
    "",
    "סיכום מנהלים",
    plan.executiveSummary,
    "",
    "שבוע ראשון — עדיפויות",
    ...plan.firstWeekPriorities.map((p) => `☐ ${p}`),
    "",
    phaseToText("30 יום", plan.day30),
    "",
    phaseToText("60 יום", plan.day60),
    "",
    phaseToText("90 יום", plan.day90),
    "",
    "שאלות לשאול בראיון",
    ...plan.questionsToAskInterviewer.map((q, i) => `${i + 1}. ${q}`),
  ].join("\n");
}

const PHASE_COLORS = [
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
];

function PhaseCard({
  label,
  phase,
  colorClass,
}: {
  label: string;
  phase: Phase;
  colorClass: string;
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`border ${colorClass} text-xs font-semibold`}>
            {label}
          </Badge>
          <span className="text-sm font-medium">{phase.theme}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            יעדים
          </p>
          <ul className="space-y-1.5">
            {phase.goals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Target className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                {g}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            פעולות מפתח
          </p>
          <ul className="space-y-1.5">
            {phase.keyActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary/60 shrink-0 font-mono text-xs mt-0.5">
                  {i + 1}.
                </span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div className="flex items-start gap-2">
          <CheckCircle2 className="size-3.5 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
              מדד הצלחה
            </p>
            <p className="text-sm">{phase.successMetric}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Plan306090({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);

  async function generate() {
    if (!job.parsed) {
      toast.error("לא ניתן לייצר תכנית — המשרה לא פוענחה");
      return;
    }
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error("העלה קורות חיים תחילה");
      return;
    }

    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: PlanResult }>(
        "/api/plan-30-60-90",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
        },
        { t, fallback: "יצירת התכנית נכשלה" },
      );
      setResult(data.result);
      toast.success("התכנית מוכנה");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyAll() {
    if (!result) return;
    const text = planToText(result, job.parsed?.title);
    navigator.clipboard.writeText(text);
    toast.success(t("common.copied"));
  }

  function downloadTxt() {
    if (!result) return;
    const text = planToText(result, job.parsed?.title);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-30-60-90-${(job.parsed?.title ?? "job").replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {t("plan.title")}
          </CardTitle>
          <CardDescription>{t("plan.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("plan.running")}
            </div>
          ) : (
            <Button onClick={generate}>
              <Sparkles className="size-4 me-2" />
              {t("plan.run")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card className="glass bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" />
                {t("plan.title")}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">{t("plan.desc")}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={copyAll}>
                <Copy className="size-3 me-1.5" />
                {t("plan.copy")}
              </Button>
              <Button size="sm" variant="outline" onClick={downloadTxt}>
                <Download className="size-3 me-1.5" />
                {t("plan.download")}
              </Button>
              <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                <span className="ms-1.5 text-xs">{t("plan.regenerate")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Executive Summary */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("plan.summary")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          {result.executiveSummary}
        </CardContent>
      </Card>

      {/* First week priorities */}
      <Card className="glass border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            {t("plan.week1")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.firstWeekPriorities.map((p, i) => (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded accent-primary shrink-0"
              />
              <span className="text-sm group-has-[:checked]:line-through group-has-[:checked]:text-muted-foreground transition-colors">
                {p}
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Three phase cards */}
      <PhaseCard label="30 יום" phase={result.day30} colorClass={PHASE_COLORS[0]} />
      <PhaseCard label="60 יום" phase={result.day60} colorClass={PHASE_COLORS[1]} />
      <PhaseCard label="90 יום" phase={result.day90} colorClass={PHASE_COLORS[2]} />

      {/* Questions to ask in the interview */}
      {result.questionsToAskInterviewer.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("plan.questions")}</CardTitle>
            <CardDescription className="text-xs">
              שאלות שמראות שאתה חושב כמו מי שכבר בתפקיד
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.questionsToAskInterviewer.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary/60 shrink-0 font-mono text-xs mt-0.5">
                  {i + 1}.
                </span>
                <p>{q}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
