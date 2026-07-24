"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import type { LinkedInDiagnosisResult } from "@/lib/ai/schemas";

type Axis = LinkedInDiagnosisResult["axisAssessment"][number]["axis"];
type Level = LinkedInDiagnosisResult["axisAssessment"][number]["level"];

const AXIS_KEY: Record<Axis, Key> = {
  searchAppearance: "linkedin.diag.results.axis.searchAppearance",
  initialScreening: "linkedin.diag.results.axis.initialScreening",
  keywordMatch: "linkedin.diag.results.axis.keywordMatch",
  activitySignals: "linkedin.diag.results.axis.activitySignals",
  visibilitySettings: "linkedin.diag.results.axis.visibilitySettings",
};

const LEVEL_KEY: Record<Level, Key> = {
  low: "linkedin.diag.results.level.low",
  medium: "linkedin.diag.results.level.medium",
  high: "linkedin.diag.results.level.high",
};

const LEVEL_COLOR: Record<Level, string> = {
  low: "border-red-500/30 text-red-400",
  medium: "border-amber-500/30 text-amber-400",
  high: "border-green-500/30 text-green-400",
};

export function DiagnosisResults({ result }: { result: LinkedInDiagnosisResult }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  function copy(i: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [i]: false })), 2000);
    toast.success(t("common.copied"));
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <span className="text-sm font-medium">{t("linkedin.diag.results.axisTitle")}</span>
        </div>
        <div className="divide-y divide-border/30">
          {result.axisAssessment.map((a) => (
            <div key={a.axis} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t(AXIS_KEY[a.axis])}</span>
                <Badge variant="outline" className={`text-xs ${LEVEL_COLOR[a.level]}`}>
                  {t(LEVEL_KEY[a.level])}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{a.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {result.gaps.length > 0 && (
        <div className="glass rounded-xl p-4 border border-border/40">
          <div className="text-sm font-medium mb-2">{t("linkedin.diag.results.gapsTitle")}</div>
          <ul className="space-y-1.5">
            {result.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-foreground/80 flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.conflicts.length > 0 && (
        <div className="glass rounded-xl p-4 border border-amber-500/30">
          <div className="text-sm font-medium mb-1">{t("linkedin.diag.results.conflictsTitle")}</div>
          <p className="text-xs text-muted-foreground mb-2">{t("linkedin.diag.results.conflictsDesc")}</p>
          <ul className="space-y-2">
            {result.conflicts.map((c, i) => (
              <li key={i} className="text-xs text-foreground/80">
                <span className="font-medium">{c.field}:</span> CV — {c.resumeSays} / Profile — {c.profileSays}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="glass rounded-xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <span className="text-sm font-medium">{t("linkedin.diag.results.recommendationsTitle")}</span>
          </div>
          <div className="divide-y divide-border/30">
            {result.recommendations
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((rec, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <div className="text-sm font-medium">{rec.title}</div>
                  <p className="text-xs text-muted-foreground">{rec.why}</p>
                  {rec.readyToPasteText && (
                    <div className="bg-muted/20 rounded-lg p-3 flex items-start justify-between gap-2">
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans flex-1">
                        {rec.readyToPasteText}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs shrink-0"
                        onClick={() => copy(i, rec.readyToPasteText!)}
                      >
                        <Copy className="size-3" />
                        {copied[i] ? t("common.copied") : t("common.copy")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4 border border-border/40">
        <div className="text-sm font-medium mb-1">{t("linkedin.diag.results.bottomLineTitle")}</div>
        <p className="text-xs text-foreground/80">{result.bottomLine}</p>
      </div>
    </div>
  );
}
