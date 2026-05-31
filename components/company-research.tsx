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
import { Sparkles, Loader2, Building2, AlertTriangle, MessageSquare, Lightbulb, Target } from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type ResearchResult = {
  companySnapshot: string;
  companyStage: string;
  teamSizeHint: string;
  techCultureSignals: string[];
  whatTheyValue: string[];
  painPoints: string[];
  redFlags: string[];
  smartQuestionsToAsk: string[];
  urgencySignals: string;
  competitiveEdgeForRole: string;
};

const STAGE_LABELS: Record<string, string> = {
  early_startup: "🌱 Startup מוקדם",
  growth_startup: "🚀 Startup בצמיחה",
  scaleup: "📈 Scale-up",
  enterprise: "🏢 Enterprise",
  unknown: "לא ידוע",
};

export function CompanyResearch({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);

  async function generate() {
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: ResearchResult }>(
        "/api/company-research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: job.parsed }),
        },
        { t, fallback: "Research failed" },
      );
      setResult(data.result);
      toast.success("ניתוח החברה מוכן");
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
            <Building2 className="size-4 text-primary" />
            ניתוח חברה לפני ראיון
          </CardTitle>
          <CardDescription>
            AI מנתח את תיאור המשרה ומחלץ אינטליגנציה עסקית — שלב החברה, תרבות, כאב, ושאלות חכמות לשאול.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              מנתח תיאור המשרה...
            </div>
          ) : (
            <Button onClick={generate}>
              <Sparkles className="size-4 me-2" />
              נתח את החברה
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-primary" />
                ניתוח חברה
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{STAGE_LABELS[result.companyStage] ?? result.companyStage}</Badge>
                {result.teamSizeHint && (
                  <span className="text-xs text-muted-foreground">{result.teamSizeHint}</span>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          {result.companySnapshot}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {result.whatTheyValue.length > 0 && (
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="size-3.5 text-green-400" />
                מה שחשוב להם
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {result.whatTheyValue.map((v, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                  {v}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {result.painPoints.length > 0 && (
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="size-3.5 text-amber-400" />
                הכאב שהם פותרים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {result.painPoints.map((p, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                  {p}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {result.techCultureSignals.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">סיגנלים תרבותיים וטכניים</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {result.techCultureSignals.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {result.redFlags.length > 0 && (
        <Card className="glass border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-3.5 text-amber-400" />
              דגלים אדומים פוטנציאליים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {result.redFlags.map((f, i) => (
              <p key={i} className="text-xs text-amber-300/80">{f}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="size-3.5 text-primary" />
            שאלות חכמות לשאול בראיון
          </CardTitle>
          <CardDescription className="text-xs">
            שאלות שמראות שעשית שיעורי בית ושאתה חושב כמו שלהם
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.smartQuestionsToAsk.map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary/60 mt-0.5 shrink-0 font-mono text-xs">{i + 1}.</span>
              <p>{q}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {result.competitiveEdgeForRole && (
        <Card className="glass bg-primary/5 border-primary/20">
          <CardContent className="pt-4 text-sm">
            <span className="font-semibold text-primary">היתרון שלך: </span>
            {result.competitiveEdgeForRole}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
