"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Scale, Plus, Trash2, Trophy, TrendingUp, DollarSign, Sparkles, Loader2, Home, Star, AlertTriangle } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { aiFetchJson } from "@/lib/utils";

type Offer = {
  id: string;
  company: string;
  role: string;
  salary: number;
  currency: "ILS" | "USD" | "EUR";
  bonusPct: number;
  equityAnnual: number;
  wfhDays: number;
  growthPotential: number;
  cultureFit: number;
  stability: number;
  notes: string;
};

type Priorities = {
  compensation: number;
  workLife: number;
  growth: number;
  culture: number;
  stability: number;
};

type AIResult = {
  recommendation: string;
  perOfferInsights: { company: string; keyStrength: string; hiddenRisk: string }[];
  longTermThought: string;
  negotiationTip: string;
};

const EMPTY_OFFER = (): Offer => ({
  id: Math.random().toString(36).slice(2),
  company: "", role: "", salary: 0, currency: "ILS",
  bonusPct: 0, equityAnnual: 0, wfhDays: 0,
  growthPotential: 3, cultureFit: 3, stability: 3, notes: "",
});

const DEFAULT_PRIORITIES: Priorities = {
  compensation: 7, workLife: 6, growth: 8, culture: 6, stability: 5,
};

function totalComp(o: Offer) {
  return o.salary * 12 + (o.salary * 12 * o.bonusPct / 100) + o.equityAnnual;
}

function weightedScore(o: Offer, p: Priorities): number {
  const total = totalComp(o);
  const maxSalary = 600000;
  const scores = {
    compensation: Math.min(total / maxSalary, 1) * 10,
    workLife: (o.wfhDays / 5) * 10,
    growth: o.growthPotential * 2,
    culture: o.cultureFit * 2,
    stability: o.stability * 2,
  };
  const totalWeight = p.compensation + p.workLife + p.growth + p.culture + p.stability;
  return Math.round(
    (scores.compensation * p.compensation +
     scores.workLife * p.workLife +
     scores.growth * p.growth +
     scores.culture * p.culture +
     scores.stability * p.stability) / totalWeight * 10
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}>
          <Star className={`size-5 ${s <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function PrioritySlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <input
        type="range" min={0} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export default function OfferComparePage() {
  const { t, lang } = useLang();
  const [offers, setOffers] = useState<Offer[]>([EMPTY_OFFER(), EMPTY_OFFER()]);
  const [priorities, setPriorities] = useState<Priorities>(DEFAULT_PRIORITIES);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [scored, setScored] = useState<{ offer: Offer; score: number }[] | null>(null);

  function updateOffer(id: string, patch: Partial<Offer>) {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
  }

  function addOffer() {
    if (offers.length >= 4) return;
    setOffers((prev) => [...prev, EMPTY_OFFER()]);
  }

  function removeOffer(id: string) {
    if (offers.length <= 2) return;
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  async function compare() {
    const valid = offers.filter((o) => o.company && o.salary > 0);
    if (valid.length < 2) { toast.error("מלא לפחות 2 הצעות עם שם חברה ושכר"); return; }

    const ranked = [...valid].map((o) => ({ offer: o, score: weightedScore(o, priorities) }))
      .sort((a, b) => b.score - a.score);
    setScored(ranked);
    setBusy(true);

    try {
      const data = await aiFetchJson<{ result: AIResult }>(
        "/api/offer-compare",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offers: valid.map((o) => ({ ...o, totalCompAnnual: totalComp(o) })),
            priorities,
            language: lang,
          }),
        },
        { t, fallback: "ניתוח נכשל" },
      );
      setResult(data.result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const RANK_STYLE = [
    "border-amber-400/40 bg-amber-500/5",
    "border-slate-400/40 bg-slate-500/5",
    "border-orange-700/30 bg-orange-900/5",
    "border-border/40",
  ];

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-10 space-y-6 pb-20 md:pb-10">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Scale className="size-7 text-primary" />
          {t("compare.title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("compare.desc")}</p>
      </header>

      {/* Offers */}
      <section className="space-y-4">
        {offers.map((o, idx) => (
          <Card key={o.id} className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">הצעה {idx + 1}</CardTitle>
                {offers.length > 2 && (
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => removeOffer(o.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.company")}</Label>
                <Input value={o.company} onChange={(e) => updateOffer(o.id, { company: e.target.value })} placeholder="Google, Meta..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.role")}</Label>
                <Input value={o.role} onChange={(e) => updateOffer(o.id, { role: e.target.value })} placeholder="Senior Engineer..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.salary")} / חודש</Label>
                <div className="flex gap-1">
                  <select className="text-xs border border-input rounded-md px-2 bg-background" value={o.currency} onChange={(e) => updateOffer(o.id, { currency: e.target.value as Offer["currency"] })}>
                    <option>ILS</option><option>USD</option><option>EUR</option>
                  </select>
                  <Input type="number" value={o.salary || ""} onChange={(e) => updateOffer(o.id, { salary: Number(e.target.value) })} placeholder="35000" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.bonus")}</Label>
                <Input type="number" value={o.bonusPct || ""} onChange={(e) => updateOffer(o.id, { bonusPct: Number(e.target.value) })} placeholder="10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.equity")} / שנה</Label>
                <Input type="number" value={o.equityAnnual || ""} onChange={(e) => updateOffer(o.id, { equityAnnual: Number(e.target.value) })} placeholder="50000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.wfh")} / שבוע</Label>
                <select className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background" value={o.wfhDays} onChange={(e) => updateOffer(o.id, { wfhDays: Number(e.target.value) })}>
                  {[0,1,2,3,4,5].map((d) => <option key={d} value={d}>{d === 5 ? "Full remote" : d === 0 ? "Office only" : `${d} ימים`}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.growth")}</Label>
                <StarRating value={o.growthPotential} onChange={(v) => updateOffer(o.id, { growthPotential: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("compare.culture")}</Label>
                <StarRating value={o.cultureFit} onChange={(v) => updateOffer(o.id, { cultureFit: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">יציבות / מוניטין</Label>
                <StarRating value={o.stability} onChange={(v) => updateOffer(o.id, { stability: v })} />
              </div>
              {o.salary > 0 && (
                <div className="sm:col-span-2 md:col-span-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("compare.totalComp")}:{" "}
                    <span className="font-semibold text-foreground">
                      {o.currency} {totalComp(o).toLocaleString()} / שנה
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {offers.length < 4 && (
          <Button variant="outline" size="sm" onClick={addOffer} className="w-full">
            <Plus className="size-4 me-2" />
            {t("compare.addOffer")}
          </Button>
        )}
      </section>

      {/* Priorities */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">{t("compare.priorities")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PrioritySlider label={t("compare.salary")} value={priorities.compensation} onChange={(v) => setPriorities((p) => ({ ...p, compensation: v }))} />
          <PrioritySlider label={t("compare.wfh")} value={priorities.workLife} onChange={(v) => setPriorities((p) => ({ ...p, workLife: v }))} />
          <PrioritySlider label={t("compare.growth")} value={priorities.growth} onChange={(v) => setPriorities((p) => ({ ...p, growth: v }))} />
          <PrioritySlider label={t("compare.culture")} value={priorities.culture} onChange={(v) => setPriorities((p) => ({ ...p, culture: v }))} />
          <PrioritySlider label="יציבות" value={priorities.stability} onChange={(v) => setPriorities((p) => ({ ...p, stability: v }))} />
        </CardContent>
      </Card>

      <Button onClick={compare} disabled={busy} size="lg" className="w-full">
        {busy ? <><Loader2 className="size-4 me-2 animate-spin" />{t("compare.comparing")}</> : <><Scale className="size-4 me-2" />{t("compare.compare")}</>}
      </Button>

      {/* Results */}
      {scored && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("compare.score")}</h2>
          {scored.map(({ offer: o, score }, idx) => (
            <Card key={o.id} className={`border ${RANK_STYLE[idx] ?? RANK_STYLE[3]}`}>
              <CardContent className="py-4 px-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Trophy className="size-4 text-amber-400" />}
                    <span className="font-semibold">{o.company}</span>
                    <span className="text-xs text-muted-foreground">{o.role}</span>
                  </div>
                  <span className={`text-2xl font-bold tabular-nums ${idx === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{score}</span>
                </div>
                <Progress value={score * 10} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {o.currency} {totalComp(o).toLocaleString()} / שנה ·{" "}
                  {o.wfhDays === 5 ? "Full remote" : o.wfhDays === 0 ? "Office" : `${o.wfhDays}d WFH`}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {result && (
        <section className="space-y-4">
          <Card className="glass bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                {t("compare.recommendation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">{result.recommendation}</CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {result.perOfferInsights.map((ins) => (
              <Card key={ins.company} className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">{ins.company}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="flex gap-1.5 text-green-400"><TrendingUp className="size-3 mt-0.5 shrink-0" />{ins.keyStrength}</p>
                  <p className="flex gap-1.5 text-amber-400"><AlertTriangle className="size-3 mt-0.5 shrink-0" />{ins.hiddenRisk}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass">
            <CardContent className="pt-4 space-y-3 text-sm">
              <p><span className="font-semibold text-primary">מבט לטווח ארוך: </span>{result.longTermThought}</p>
              <Separator />
              <p><span className="font-semibold text-primary">טיפ למשא ומתן: </span>{result.negotiationTip}</p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
