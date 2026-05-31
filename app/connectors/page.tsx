"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Search,
  Loader2,
  Plus,
  Bot,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { store, type StoredPreferences } from "@/lib/storage";
import type { ConnectorJob } from "@/lib/connectors/types";
import { useLang } from "@/components/lang-provider";

const SUGGESTIONS: Record<"greenhouse" | "lever" | "workday", string[]> = {
  greenhouse: ["vercel", "stripe", "airbnb", "anthropic", "openai", "wix"],
  lever: ["spotify", "netflix", "shopify", "github", "lyft"],
  workday: [
    "https://siemens.wd1.myworkdayjobs.com/Siemens_Careers",
    "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site",
    "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
  ],
};

export default function ConnectorsPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [prefs, setPrefs] = useState<StoredPreferences | null>(null);

  useEffect(() => {
    setPrefs(store.getPrefs());
  }, []);

  return (
    <div className="container max-w-5xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t("explore.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("explore.subtitle")}</p>
      </header>

      <Tabs defaultValue="smart">
        <TabsList>
          <TabsTrigger value="smart">
            <Sparkles className="size-3.5 me-1.5" />
            {t("smart.tab.smart")}
          </TabsTrigger>
          <TabsTrigger value="company">{t("smart.tab.byCompany")}</TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="pt-4">
          <SmartSearch prefs={prefs} onPrefsClick={() => router.push("/settings")} />
        </TabsContent>

        <TabsContent value="company" className="pt-4">
          <ByCompany lang={lang} />
        </TabsContent>
      </Tabs>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("connectors.copilot.title")}</CardTitle>
          </div>
          <CardDescription>{t("connectors.copilot.desc")}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function SmartSearch({
  prefs,
  onPrefsClick,
}: {
  prefs: StoredPreferences | null;
  onPrefsClick: () => void;
}) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ConnectorJob[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recentDays, setRecentDays] = useState<1 | 3 | 7 | 14 | 30>(14);
  const [sources, setSources] = useState<("linkedin" | "workday" | "alljobs" | "drushim")[]>([
    "linkedin",
    "workday",
    "alljobs",
    "drushim",
  ]);

  const hasPrefs =
    prefs &&
    ((prefs.targetRoles?.length ?? 0) > 0 || (prefs.techMust?.length ?? 0) > 0);

  async function run() {
    if (!hasPrefs) return;
    setBusy(true);
    setResults([]);
    setErrors([]);
    setImported(new Set());
    try {
      const res = await fetch("/api/connectors/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoles: prefs?.targetRoles ?? [],
          techMust: prefs?.techMust ?? [],
          locations: prefs?.locations ?? [],
          remoteOk: prefs?.remoteOk ?? true,
          recentDays,
          workdayBoards: prefs?.workdayBoards,
          sources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.jobs as ConnectorJob[]);
      setCounts(data.counts ?? {});
      setErrors(data.errors ?? []);
      if (data.jobs.length === 0) {
        toast.info(t("smart.noResults"));
      } else {
        toast.success(`${t("smart.results")} ${data.jobs.length}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importJob(j: ConnectorJob) {
    setBusy(true);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: j.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const id = nanoid(10);
      store.saveJob({
        id,
        url: j.url,
        parsed: data.parsed,
        rawText: data.rawText,
        status: "saved",
        createdAt: new Date().toISOString(),
      });
      setImported((prev) => new Set(prev).add(j.externalId));
      toast.success(t("discover.imported"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!hasPrefs) {
    return (
      <Card className="glass">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="size-14 rounded-2xl bg-amber-500/10 grid place-items-center border border-amber-500/30">
            <AlertTriangle className="size-6 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("smart.noPrefs")}
          </p>
          <Button onClick={onPrefsClick}>{t("smart.goPrefs")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center shrink-0 border border-primary/20">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("smart.title")}</CardTitle>
              <CardDescription className="mt-1">
                {t("smart.subtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(prefs?.targetRoles ?? []).slice(0, 3).map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
            {(prefs?.techMust ?? []).slice(0, 3).map((tch) => (
              <Badge key={tch} variant="outline">{tch}</Badge>
            ))}
            {(prefs?.locations ?? []).slice(0, 2).map((loc) => (
              <Badge key={loc} variant="outline" className="gap-1">
                <MapPin className="size-3" />
                {loc}
              </Badge>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-1">
              <Label>{t("smart.sources")}</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSources((s) =>
                      s.includes("linkedin")
                        ? s.filter((x) => x !== "linkedin")
                        : [...s, "linkedin"],
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    sources.includes("linkedin")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSources((s) =>
                      s.includes("workday")
                        ? s.filter((x) => x !== "workday")
                        : [...s, "workday"],
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    sources.includes("workday")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  Workday
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSources((s) =>
                      s.includes("alljobs")
                        ? s.filter((x) => x !== "alljobs")
                        : [...s, "alljobs"],
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    sources.includes("alljobs")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  AllJobs 🇮🇱
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSources((s) =>
                      s.includes("drushim")
                        ? s.filter((x) => x !== "drushim")
                        : [...s, "drushim"],
                    )
                  }
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    sources.includes("drushim")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  Drushim 🇮🇱
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("smart.recentDays")}</Label>
              <Select
                value={String(recentDays)}
                onValueChange={(v) => setRecentDays(Number(v) as typeof recentDays)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("smart.recentDays.1")}</SelectItem>
                  <SelectItem value="3">{t("smart.recentDays.3")}</SelectItem>
                  <SelectItem value="7">{t("smart.recentDays.7")}</SelectItem>
                  <SelectItem value="14">{t("smart.recentDays.14")}</SelectItem>
                  <SelectItem value="30">{t("smart.recentDays.30")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={run}
              disabled={busy || sources.length === 0}
              className="md:self-end"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  {t("smart.searching")}
                </>
              ) : (
                <>
                  <Search className="size-4 me-2" />
                  {t("smart.run")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="glass border-amber-500/30">
          <CardContent className="py-3 text-xs text-amber-400 flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">{t("smart.partial")}</p>
              <ul className="list-disc ps-5 space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t("smart.results")} {results.length} ({Object.entries(counts)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")})
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/jobs">{t("nav.jobs")} →</Link>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {results.map((j) => (
              <JobCard
                key={`${j.source}-${j.externalId}`}
                job={j}
                imported={imported.has(j.externalId)}
                onImport={() => importJob(j)}
                disabled={busy}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ByCompany({ lang }: { lang: "he" | "en" }) {
  const { t } = useLang();
  const router = useRouter();
  const [source, setSource] = useState<"greenhouse" | "lever" | "workday">("greenhouse");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ConnectorJob[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());

  async function search(value?: string) {
    const raw = (value ?? token).trim();
    const q = source === "workday" ? raw : raw.toLowerCase();
    if (!q) return;
    setToken(q);
    setBusy(true);
    setResults([]);
    setImported(new Set());
    try {
      const res = await fetch("/api/connectors/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, token: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.jobs as ConnectorJob[]);
      if (data.jobs.length === 0) {
        toast.info(t("discover.empty"));
      } else {
        toast.success(`${t("discover.found")} ${data.jobs.length} ${t("discover.jobs")}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importJob(j: ConnectorJob) {
    setBusy(true);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${j.title}\n${j.company}\n${j.location ?? ""}\n\n${j.description ?? ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const id = nanoid(10);
      store.saveJob({
        id,
        url: j.url,
        parsed: data.parsed,
        rawText: data.rawText,
        status: "saved",
        createdAt: new Date().toISOString(),
      });
      setImported((prev) => new Set(prev).add(j.externalId));
      toast.success(t("discover.imported"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center shrink-0 border border-primary/20">
              <Bot className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("discover.title")}</CardTitle>
              <CardDescription className="mt-1">{t("discover.subtitle")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
            <div className="space-y-1">
              <Label>{t("discover.source")}</Label>
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="greenhouse">Greenhouse</SelectItem>
                  <SelectItem value="lever">Lever</SelectItem>
                  <SelectItem value="workday">Workday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("discover.token")}</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder={
                  source === "greenhouse"
                    ? "vercel"
                    : source === "lever"
                    ? "spotify"
                    : "https://siemens.wd1.myworkdayjobs.com/..."
                }
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {source === "greenhouse"
                  ? t("discover.tokenHelp.gh")
                  : source === "lever"
                  ? t("discover.tokenHelp.lever")
                  : t("discover.tokenHelp.workday")}
              </p>
            </div>
            <Button onClick={() => search()} disabled={busy || !token.trim()}>
              {busy ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  {t("discover.searching")}
                </>
              ) : (
                <>
                  <Search className="size-4 me-2" />
                  {t("discover.search")}
                </>
              )}
            </Button>
          </div>

          {results.length === 0 && !busy && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                {t("discover.suggestions.title")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS[source].map((s) => (
                  <button
                    key={s}
                    onClick={() => search(s)}
                    disabled={busy}
                    className="text-xs px-3 py-1 rounded-full border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all max-w-full truncate"
                    title={s}
                  >
                    {s.length > 40 ? s.slice(0, 40) + "..." : s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t("discover.found")} {results.length} {t("discover.jobs")}
            </span>
            <Button size="sm" variant="outline" onClick={() => router.push("/jobs")}>
              {t("nav.jobs")} →
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {results.map((j) => (
              <JobCard
                key={`${j.source}-${j.externalId}`}
                job={j}
                imported={imported.has(j.externalId)}
                onImport={() => importJob(j)}
                disabled={busy}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  imported,
  onImport,
  disabled,
  lang,
}: {
  job: ConnectorJob;
  imported: boolean;
  onImport: () => void;
  disabled: boolean;
  lang: "he" | "en";
}) {
  const { t } = useLang();
  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base">{job.title}</CardTitle>
            <CardDescription className="flex items-center gap-3 text-xs flex-wrap">
              <span className="font-medium">{job.company}</span>
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {job.location}
                </span>
              )}
              {job.remote && <Badge variant="secondary">Remote</Badge>}
            </CardDescription>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Open original"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {t("discover.via") + " " + (job.source.charAt(0).toUpperCase() + job.source.slice(1))}
        </Badge>
        {imported ? (
          <Badge className="gap-1">
            <CheckCircle2 className="size-3" />
            {t("discover.importedSimple")}
          </Badge>
        ) : (
          <Button size="sm" onClick={onImport} disabled={disabled}>
            <Plus className="size-3.5 me-1" />
            {t("discover.import")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
