"use client";

import { useState } from "react";
import type { StoredJob } from "@/lib/storage";
import { store } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Loader2,
  PartyPopper,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  DollarSign,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";

type NegotiationResult = {
  marketRateMin: number;
  marketRateMax: number;
  counterOfferMin: number;
  counterOfferMax: number;
  currency: string;
  riskLevel: "low" | "medium" | "high";
  riskExplanation: string;
  negotiationScript: string;
  leveragePoints: string[];
  redLines: string[];
  nonSalaryPerks: string[];
  openingLine: string;
};

export function SalaryNegotiation({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [offeredSalary, setOfferedSalary] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [equity, setEquity] = useState("");
  const [signingBonus, setSigningBonus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  if (job.status !== "offer") return null;

  async function generate() {
    if (!offeredSalary) {
      toast.error("הכנס שכר שהוצע");
      return;
    }
    setLoading(true);
    try {
      const resume = store.getResume();
      const res = await fetch("/api/salary/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeredSalary: Number(offeredSalary),
          currency,
          equity: equity ? Number(equity) : undefined,
          signingBonus: signingBonus || undefined,
          resume: resume?.parsed,
          job: job.parsed,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error(t("error.rateLimit"));
        } else {
          toast.error(err.error ?? "שגיאה בייצור האסטרטגיה");
        }
        return;
      }
      const data = await res.json();
      setResult(data.result);
    } catch {
      toast.error("שגיאה בייצור האסטרטגיה");
    } finally {
      setLoading(false);
    }
  }

  function copyScript() {
    if (!result) return;
    navigator.clipboard.writeText(result.negotiationScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
    toast.success(t("common.copied"));
  }

  const riskColor =
    result?.riskLevel === "low"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : result?.riskLevel === "medium"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";

  const riskLabel =
    result?.riskLevel === "low"
      ? t("salary.risk.low")
      : result?.riskLevel === "medium"
        ? t("salary.risk.medium")
        : t("salary.risk.high");

  return (
    <div className="space-y-4">
      {/* Celebration header */}
      <div className="glass rounded-xl p-5 border border-green-500/20 bg-gradient-to-br from-green-500/5 to-yellow-500/5">
        <div className="flex items-center gap-3 mb-1">
          <PartyPopper className="size-6 text-yellow-400" />
          <h2 className="text-lg font-bold text-foreground">
            {t("salary.offer.received")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("salary.title")} — {job.parsed.company}
        </p>
      </div>

      {/* Input form */}
      <div className="glass rounded-xl p-4 border border-border/40 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("salary.offeredSalary")}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="25,000"
                value={offeredSalary}
                onChange={(e) => setOfferedSalary(e.target.value)}
                className="bg-background/50"
              />
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? "ILS")}>
                <SelectTrigger className="w-24 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ ILS</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Equity (%)
            </Label>
            <Input
              type="number"
              placeholder="0.5"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              className="bg-background/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Signing Bonus
          </Label>
          <Input
            placeholder="e.g. 10,000 ILS"
            value={signingBonus}
            onChange={(e) => setSigningBonus(e.target.value)}
            className="bg-background/50"
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 me-2 animate-spin" />
              {t("salary.generating")}
            </>
          ) : (
            <>
              <Sparkles className="size-4 me-2" />
              {t("salary.generate")}
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Counter-offer range */}
          <div className="glass rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 text-green-400" />
              <span className="text-sm font-medium">
                {t("salary.counterRange")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center flex-1 bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="text-xs text-muted-foreground mb-1">מינ׳</div>
                <div className="text-xl font-bold text-green-400">
                  {result.counterOfferMin.toLocaleString()}
                </div>
              </div>
              <div className="text-muted-foreground text-sm">—</div>
              <div className="text-center flex-1 bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="text-xs text-muted-foreground mb-1">מקס׳</div>
                <div className="text-xl font-bold text-green-400">
                  {result.counterOfferMax.toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-muted-foreground self-end pb-1">
                {result.currency}/חודש
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              שוק: {result.marketRateMin.toLocaleString()}–
              {result.marketRateMax.toLocaleString()} {result.currency}
            </p>
          </div>

          {/* Risk level */}
          <div
            className={`rounded-xl p-3 border flex items-start gap-2 ${riskColor}`}
          >
            <ShieldAlert className="size-4 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold mb-0.5">{riskLabel}</div>
              <p className="text-xs opacity-80">{result.riskExplanation}</p>
            </div>
          </div>

          {/* Opening line */}
          {result.openingLine && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-xs text-muted-foreground mb-2">
                {t("salary.opening")}
              </div>
              <p className="text-sm italic text-foreground/90">
                &ldquo;{result.openingLine}&rdquo;
              </p>
            </div>
          )}

          {/* Negotiation script */}
          <div className="glass rounded-xl p-4 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("salary.script")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyScript}
                className="h-7 gap-1 text-xs"
              >
                <Copy className="size-3" />
                {copiedScript ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-sans leading-relaxed">
              {result.negotiationScript}
            </pre>
          </div>

          {/* Leverage points */}
          {result.leveragePoints.length > 0 && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-amber-400" />
                <span className="text-sm font-medium">
                  {t("salary.leverage")}
                </span>
              </div>
              <ul className="space-y-1">
                {result.leveragePoints.map((point, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className="text-amber-400 shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Non-salary perks */}
          {result.nonSalaryPerks.length > 0 && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="size-4 text-purple-400" />
                <span className="text-sm font-medium">
                  {t("salary.perks")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.nonSalaryPerks.map((perk, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs border-purple-500/30 text-purple-300"
                  >
                    {perk}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
