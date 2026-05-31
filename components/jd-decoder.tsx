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
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { type StoredJob } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type RealRequirement = { stated: string; actual: string };
type RedFlag = { phrase: string; meaning: string };

type DecoderResult = {
  verdict: string;
  realRequirements: RealRequirement[];
  redFlags: RedFlag[];
  hiddenContext: string;
  idealCandidate: string;
  budgetSignal: "junior_budget_senior_title" | "fair" | "genuinely_senior" | "unclear";
  urgency: "backfill" | "growth" | "new_team" | "unclear";
  overallScore: "great_opportunity" | "proceed_with_caution" | "red_flags_visible";
  positives: string[];
};

const SCORE_CONFIG: Record<
  DecoderResult["overallScore"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  great_opportunity: {
    label: "הזדמנות טובה",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="size-4" />,
  },
  proceed_with_caution: {
    label: "תמשיך בזהירות",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: <AlertTriangle className="size-4" />,
  },
  red_flags_visible: {
    label: "דגלים אדומים",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <AlertTriangle className="size-4" />,
  },
};

const BUDGET_LABELS: Record<DecoderResult["budgetSignal"], string> = {
  junior_budget_senior_title: "💸 תקציב ג'וניור, כותרת סניור",
  fair: "✅ תקציב הוגן",
  genuinely_senior: "🏆 סניור אמיתי",
  unclear: "❓ לא ברור",
};

const URGENCY_LABELS: Record<DecoderResult["urgency"], string> = {
  backfill: "🔄 מילוי מקום",
  growth: "📈 צמיחה",
  new_team: "🆕 צוות חדש",
  unclear: "❓ לא ברור",
};

export function JdDecoder({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DecoderResult | null>(null);

  async function generate() {
    if (!job.parsed) {
      toast.error("לא ניתן לפענח — המשרה לא פוענחה");
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: DecoderResult }>(
        "/api/jd-decoder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: job.parsed }),
        },
        { t, fallback: "פענוח ה-JD נכשל" },
      );
      setResult(data.result);
      toast.success("הפענוח מוכן");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!result) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 {t("jd.title")}
          </CardTitle>
          <CardDescription>{t("jd.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("jd.running")}
            </div>
          ) : (
            <Button onClick={generate}>
              <Sparkles className="size-4 me-2" />
              {t("jd.run")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const score = SCORE_CONFIG[result.overallScore];

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <Card className={`glass border ${score.className.replace("text-", "border-").replace(/bg-[^ ]+/, "").trim()}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <span className={score.className.split(" ").find((c) => c.startsWith("text-"))}>
                {score.icon}
              </span>
              <div>
                <CardTitle className="text-base">{t("jd.verdict")}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {result.verdict}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`border text-xs ${score.className}`}>
                {score.label}
              </Badge>
              <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {BUDGET_LABELS[result.budgetSignal]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {URGENCY_LABELS[result.urgency]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Real requirements table */}
      {result.realRequirements.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("jd.real")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-start py-2 pe-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-1/2">
                    {t("jd.stated")}
                  </th>
                  <th className="text-start py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-1/2">
                    {t("jd.actual")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.realRequirements.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 pe-4 text-muted-foreground align-top">{r.stated}</td>
                    <td className="py-2.5 align-top">{r.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Red flags */}
      {result.redFlags.length > 0 && (
        <Card className="glass border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-amber-400" />
              {t("jd.redflags")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.redFlags.map((f, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-sm font-medium flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">⚠️</span>
                  <span className="italic text-muted-foreground">&ldquo;{f.phrase}&rdquo;</span>
                </p>
                <p className="text-sm text-muted-foreground ps-6">{f.meaning}</p>
                {i < result.redFlags.length - 1 && <Separator className="mt-2" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Hidden context */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("jd.context")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {result.hiddenContext}
          </CardContent>
        </Card>

        {/* Ideal candidate */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("jd.ideal")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {result.idealCandidate}
          </CardContent>
        </Card>
      </div>

      {/* Positives */}
      {result.positives.length > 0 && (
        <Card className="glass bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              {t("jd.positives")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {result.positives.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
