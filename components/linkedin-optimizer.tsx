"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Copy,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";

type ExperienceRewrite = {
  company: string;
  role: string;
  rewrittenSummary: string;
  topBullets: string[];
};

type LinkedInResult = {
  headline: string;
  about: string;
  experienceRewrites: ExperienceRewrite[];
  skillsToHighlight: string[];
  keywordsToAdd: string[];
  profileTips: string[];
  estimatedProfileStrength: number;
};

export function LinkedInOptimizer() {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [language, setLanguage] = useState<"he" | "en">("he");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [openExp, setOpenExp] = useState<Record<number, boolean>>({});
  const [copiedHeadline, setCopiedHeadline] = useState(false);
  const [copiedAbout, setCopiedAbout] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedBullets, setCopiedBullets] = useState<Record<string, boolean>>({});

  // Load target roles from prefs on mount
  useEffect(() => {
    const prefs = store.getPrefs();
    if (prefs?.targetRoles && prefs.targetRoles.length > 0) {
      setTargetRoles(prefs.targetRoles);
    }
  }, []);

  function addRole() {
    const trimmed = roleInput.trim();
    if (!trimmed || targetRoles.includes(trimmed)) return;
    setTargetRoles((prev) => [...prev, trimmed]);
    setRoleInput("");
  }

  function removeRole(role: string) {
    setTargetRoles((prev) => prev.filter((r) => r !== role));
  }

  async function optimize() {
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error("העלה קורות חיים תחילה");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.parsed,
          targetRoles,
          language,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error(t("error.rateLimit"));
        } else {
          toast.error(err.error ?? "שגיאה באופטימייזר");
        }
        return;
      }
      const data = await res.json();
      setResult(data.result);
      // Open first experience by default
      if (data.result.experienceRewrites?.length > 0) {
        setOpenExp({ 0: true });
      }
    } catch {
      toast.error("שגיאה באופטימייזר");
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
    toast.success(t("common.copied"));
  }

  function copyAll() {
    if (!result) return;
    const combined = `${result.headline}\n\n${result.about}`;
    navigator.clipboard.writeText(combined);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(t("common.copied"));
  }

  function copyBullet(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedBullets((prev) => ({ ...prev, [key]: true }));
    setTimeout(
      () => setCopiedBullets((prev) => ({ ...prev, [key]: false })),
      2000,
    );
    toast.success(t("common.copied"));
  }

  function toggleExp(i: number) {
    setOpenExp((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  const strengthColor =
    (result?.estimatedProfileStrength ?? 0) >= 80
      ? "text-green-400"
      : (result?.estimatedProfileStrength ?? 0) >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="space-y-4">
      {/* Setup card */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4 text-blue-400" />
            {t("linkedin.title")}
          </CardTitle>
          <CardDescription>{t("linkedin.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">שפה:</span>
            <button
              onClick={() => setLanguage("he")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                language === "he"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                language === "en"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              English
            </button>
          </div>

          {/* Target roles */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">תפקידי יעד</span>
            {targetRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targetRoles.map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors text-xs"
                    onClick={() => removeRole(role)}
                  >
                    {role}
                    <X className="size-3" />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="max-w-xs bg-background/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRole}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={optimize}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t("linkedin.running")}
              </>
            ) : (
              <>
                <Sparkles className="size-4 me-2" />
                {t("linkedin.run")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Profile strength */}
          <div className="glass rounded-xl p-4 border border-border/40 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("linkedin.strength")}
                </span>
                <span className={`text-sm font-bold ${strengthColor}`}>
                  {result.estimatedProfileStrength}%
                </span>
              </div>
              <Progress
                value={result.estimatedProfileStrength}
                className="h-2"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              className="shrink-0 text-xs h-8 gap-1"
            >
              <Copy className="size-3" />
              {copiedAll ? t("common.copied") : t("linkedin.copyAll")}
            </Button>
          </div>

          {/* Headline */}
          <div className="glass rounded-xl p-4 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("linkedin.headline")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {result.headline.length}/220
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyText(result.headline, setCopiedHeadline)
                  }
                  className="h-7 gap-1 text-xs"
                >
                  <Copy className="size-3" />
                  {copiedHeadline ? t("common.copied") : t("common.copy")}
                </Button>
              </div>
            </div>
            <p className="text-base font-semibold text-foreground leading-snug">
              {result.headline}
            </p>
          </div>

          {/* About */}
          <div className="glass rounded-xl p-4 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("linkedin.about")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyText(result.about, setCopiedAbout)}
                className="h-7 gap-1 text-xs"
              >
                <Copy className="size-3" />
                {copiedAbout ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed bg-muted/30 rounded-lg p-3">
              {result.about}
            </pre>
          </div>

          {/* Experience rewrites */}
          {result.experienceRewrites.length > 0 && (
            <div className="glass rounded-xl border border-border/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40">
                <span className="text-sm font-medium">
                  {t("linkedin.experience")}
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {result.experienceRewrites.map((exp, i) => (
                  <div key={i}>
                    <button
                      onClick={() => toggleExp(i)}
                      className="flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-muted/20 transition-colors"
                    >
                      <div className="text-left">
                        <div className="font-medium">{exp.role}</div>
                        <div className="text-xs text-muted-foreground">
                          {exp.company}
                        </div>
                      </div>
                      {openExp[i] ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    {openExp[i] && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Rewritten summary */}
                        <div className="bg-muted/20 rounded-lg p-3">
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            {exp.rewrittenSummary}
                          </p>
                        </div>
                        {/* Bullets */}
                        {exp.topBullets.length > 0 && (
                          <ul className="space-y-2">
                            {exp.topBullets.map((bullet, bi) => {
                              const key = `${i}-${bi}`;
                              return (
                                <li
                                  key={bi}
                                  className="flex items-start gap-2 group"
                                >
                                  <span className="text-primary shrink-0 mt-0.5 text-xs">
                                    •
                                  </span>
                                  <span className="text-xs text-foreground/80 flex-1">
                                    {bullet}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => copyBullet(key, bullet)}
                                  >
                                    <Copy className="size-3" />
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills to highlight */}
          {result.skillsToHighlight.length > 0 && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-sm font-medium mb-2">
                {t("linkedin.skills")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skillsToHighlight.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-xs border-blue-500/30 text-blue-300"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Profile tips */}
          {result.profileTips.length > 0 && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-sm font-medium mb-2">
                {t("linkedin.tips")}
              </div>
              <ol className="space-y-1.5 list-none">
                {result.profileTips.map((tip, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className="text-primary font-semibold shrink-0">
                      {i + 1}.
                    </span>
                    {tip}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
