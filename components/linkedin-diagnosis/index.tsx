"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Link2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type {
  LinkedInProfileInput,
  LinkedInAnalyticsInput,
  LinkedInUsagePatternInput,
  LinkedInDiagnosisResult,
} from "@/lib/ai/schemas";
import { ProfileInput } from "./profile-input";
import { AnalyticsInput } from "./analytics-input";
import { UsagePatternInput } from "./usage-pattern-input";
import { DiagnosisResults } from "./diagnosis-results";

const EMPTY_PROFILE: LinkedInProfileInput = {
  headline: "",
  openToWork: "off",
  location: "",
  connectionsCount: "",
  about: "",
  experience: [],
  education: "",
  certifications: "",
  skills: [],
  recommendations: "",
  projects: "",
};

const EMPTY_ANALYTICS: LinkedInAnalyticsInput = {
  ssiTotal: 0,
  ssiBrand: 0,
  ssiFindPeople: 0,
  ssiEngage: 0,
  ssiRelationships: 0,
  ssiIndustryAvg: null,
  ssiNetworkAvg: null,
  searchAppearances7d: 0,
  profileViews7d: 0,
  postImpressions7d: 0,
};

const EMPTY_USAGE: LinkedInUsagePatternInput = {
  activityFrequency: "weekly",
  postsOrEngages: false,
  receivedRecruiterMessages: "unsure",
  sendsConnectionRequests: "sometimes",
};

function isProfileComplete(p: LinkedInProfileInput): boolean {
  return Boolean(
    p.headline.trim() &&
      p.about.trim() &&
      p.location.trim() &&
      p.experience.length > 0 &&
      p.experience.every((e) => e.company.trim() && e.role.trim() && e.description.trim()) &&
      p.skills.length > 0,
  );
}

function isAnalyticsComplete(a: LinkedInAnalyticsInput): boolean {
  return a.ssiTotal > 0 && a.ssiBrand > 0 && a.ssiFindPeople > 0 && a.ssiEngage > 0 && a.ssiRelationships > 0;
}

export function LinkedInDiagnosis() {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<"he" | "en">("he");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [profile, setProfile] = useState<LinkedInProfileInput>(EMPTY_PROFILE);
  const [analytics, setAnalytics] = useState<LinkedInAnalyticsInput>(EMPTY_ANALYTICS);
  const [usagePattern, setUsagePattern] = useState<LinkedInUsagePatternInput>(EMPTY_USAGE);
  const [result, setResult] = useState<LinkedInDiagnosisResult | null>(null);

  useEffect(() => {
    const prefs = store.getPrefs();
    if (prefs?.targetRoles?.length) setTargetRoles(prefs.targetRoles);

    const saved = store.getLinkedInDiagnosis();
    if (saved) {
      setProfile(saved.profile);
      setAnalytics(saved.analytics);
      setUsagePattern(saved.usagePattern);
      if (saved.result) setResult(saved.result);
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

  const canRun = isProfileComplete(profile) && isAnalyticsComplete(analytics);

  async function runDiagnosis() {
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error(t("linkedin.diag.validation.needResume"));
      return;
    }
    if (!canRun) {
      toast.error(t("linkedin.diag.validation.needFields"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.parsed,
          targetRoles,
          language: outputLanguage,
          profile,
          analytics,
          usagePattern,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error(t("error.rateLimit"));
        else toast.error(t("linkedin.diag.error.generic"));
        return;
      }
      const data = await res.json();
      setResult(data.result);
      store.setLinkedInDiagnosis({
        profile,
        analytics,
        usagePattern,
        result: data.result,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      toast.error(t("linkedin.diag.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4 text-blue-400" />
            {t("linkedin.diag.title")}
          </CardTitle>
          <CardDescription>{t("linkedin.diag.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("linkedin.diag.language")}</span>
            <button
              onClick={() => setOutputLanguage("he")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                outputLanguage === "he"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setOutputLanguage("en")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                outputLanguage === "en"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              English
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">{t("linkedin.diag.targetRoles")}</span>
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
                placeholder="e.g. Senior SAP SD Consultant"
                className="max-w-xs bg-background/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addRole}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Separator />
          <ProfileInput value={profile} onChange={setProfile} />
          <Separator />
          <AnalyticsInput value={analytics} onChange={setAnalytics} />
          <Separator />
          <UsagePatternInput value={usagePattern} onChange={setUsagePattern} />

          <Button
            onClick={runDiagnosis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t("linkedin.diag.running")}
              </>
            ) : (
              <>
                <Sparkles className="size-4 me-2" />
                {t("linkedin.diag.run")}
              </>
            )}
          </Button>
          {!canRun && !loading && (
            <p className="text-xs text-muted-foreground text-center">
              {t("linkedin.diag.validation.needFields")}
            </p>
          )}
        </CardContent>
      </Card>

      {result && <DiagnosisResults result={result} />}
    </div>
  );
}
