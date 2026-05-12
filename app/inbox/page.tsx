"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Inbox,
  XCircle,
  CalendarCheck,
  UserPlus,
  Trophy,
  CircleAlert,
  CircleHelp,
  CircleCheck,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";
import { store, type StoredJob } from "@/lib/storage";
import type { Key, Lang } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/utils";

type Classification = {
  messageId: string;
  category:
    | "rejection"
    | "interview_invite"
    | "interview_followup"
    | "offer"
    | "recruiter_outreach"
    | "application_confirmation"
    | "automated_alert"
    | "other";
  confidence: "high" | "medium" | "low";
  matchedCompany: string | null;
  matchedJobTitle: string | null;
  matchedJobId: string | null;
  needsReply: boolean;
  suggestedAction: string | null;
  summary: string;
  suggestedStatus: StoredJob["status"] | null;
};

type EmailHeader = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date?: string;
  snippet: string;
  unread: boolean;
};

type ConnState =
  | { state: "loading" }
  | { state: "not_configured" }
  | { state: "disconnected" }
  | { state: "connected"; email: string };

export default function InboxPage() {
  const { t, lang } = useLang();
  const [conn, setConn] = useState<ConnState>({ state: "loading" });
  const [daysBack, setDaysBack] = useState<30 | 60 | 90>(60);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<EmailHeader[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    setConn({ state: "loading" });
    try {
      const res = await fetch("/api/auth/google/status");
      const data = await res.json();
      if (data.connected) {
        setConn({ state: "connected", email: data.email });
      } else if (data.error?.includes("not configured")) {
        setConn({ state: "not_configured" });
      } else {
        setConn({ state: "disconnected" });
      }
    } catch {
      setConn({ state: "disconnected" });
    }
  }

  async function disconnect() {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setMessages([]);
    setClassifications([]);
    refreshStatus();
  }

  async function scan() {
    if (conn.state !== "connected") return;
    setBusy(true);
    try {
      const jobs = store.getJobs();
      const res = await fetch("/api/gmail/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.parsed.title,
            company: j.parsed.company,
            status: j.status,
          })),
          daysBack,
          limit: 25,
        }),
      });
      if (res.status === 429) throw new Error(t("error.rateLimit"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setMessages(data.messages ?? []);
      setClassifications(data.classifications ?? []);
      toast.success(`${data.messages?.length ?? 0} ${t("inbox.scanned")}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function applyStatus(c: Classification) {
    if (!c.matchedJobId || !c.suggestedStatus) return;
    const job = store.getJob(c.matchedJobId);
    if (!job) return;
    store.saveJob({
      ...job,
      status: c.suggestedStatus,
      appliedAt:
        c.suggestedStatus === "applied" && !job.appliedAt
          ? new Date().toISOString()
          : job.appliedAt,
    });
    toast.success(t("inbox.statusUpdated"));
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Inbox className="size-7 text-primary" />
            {t("inbox.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("inbox.subtitle")}</p>
        </div>
        <ConnectionPanel state={conn} onConnect={() => (window.location.href = "/api/auth/google/start")} onDisconnect={disconnect} />
      </header>

      {conn.state === "not_configured" && <NotConfiguredCard />}
      {conn.state === "disconnected" && <NotConnectedCard onConnect={() => (window.location.href = "/api/auth/google/start")} />}

      {conn.state === "connected" && (
        <>
          <Card className="glass">
            <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("inbox.daysBack")}</label>
                <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v) as typeof daysBack)}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t("inbox.daysBack.30")}</SelectItem>
                    <SelectItem value="60">{t("inbox.daysBack.60")}</SelectItem>
                    <SelectItem value="90">{t("inbox.daysBack.90")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={scan} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 me-2 animate-spin" />
                    {t("inbox.scanning")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4 me-2" />
                    {t("inbox.scan")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {classifications.length === 0 && !busy && messages.length === 0 && (
            <Card className="glass">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {t("inbox.empty")}
              </CardContent>
            </Card>
          )}

          {classifications.length > 0 && (
            <ClassifiedList
              classifications={classifications}
              messages={messages}
              onApplyStatus={applyStatus}
            />
          )}
        </>
      )}
    </div>
  );
}

function ConnectionPanel({
  state,
  onConnect,
  onDisconnect,
}: {
  state: ConnState;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useLang();
  if (state.state === "loading") {
    return <Badge variant="outline">…</Badge>;
  }
  if (state.state === "connected") {
    return (
      <div className="flex items-center gap-2">
        <Badge className="gap-1.5">
          <CheckCircle2 className="size-3" />
          {t("inbox.connected")} {state.email}
        </Badge>
        <Button size="sm" variant="outline" onClick={onDisconnect}>
          {t("inbox.disconnect")}
        </Button>
      </div>
    );
  }
  if (state.state === "disconnected") {
    return (
      <Button onClick={onConnect}>
        <Mail className="size-4 me-2" />
        {t("inbox.connect")}
      </Button>
    );
  }
  return null;
}

function NotConfiguredCard() {
  const { t } = useLang();
  return (
    <Card className="glass border-amber-500/30">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <CardTitle className="text-base">{t("inbox.notConfigured.title")}</CardTitle>
            <CardDescription>{t("inbox.notConfigured.desc")}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function NotConnectedCard({ onConnect }: { onConnect: () => void }) {
  const { t } = useLang();
  return (
    <Card className="glass">
      <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
        <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center border border-primary/20">
          <Mail className="size-8 text-primary" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="font-semibold">{t("inbox.notConnected.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("inbox.notConnected.desc")}
          </p>
        </div>
        <Button onClick={onConnect}>
          <Mail className="size-4 me-2" />
          {t("inbox.connect")}
        </Button>
      </CardContent>
    </Card>
  );
}

const CATEGORY_META: Record<
  Classification["category"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  rejection: { icon: XCircle, color: "text-red-400 bg-red-500/10 border-red-500/30" },
  interview_invite: { icon: CalendarCheck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  interview_followup: { icon: CircleHelp, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  offer: { icon: Trophy, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  recruiter_outreach: { icon: UserPlus, color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30" },
  application_confirmation: { icon: CircleCheck, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  automated_alert: { icon: Bell, color: "text-muted-foreground bg-muted/30 border-border/50" },
  other: { icon: CircleAlert, color: "text-muted-foreground bg-muted/30 border-border/50" },
};

function ClassifiedList({
  classifications,
  messages,
  onApplyStatus,
}: {
  classifications: Classification[];
  messages: EmailHeader[];
  onApplyStatus: (c: Classification) => void;
}) {
  const { t, lang } = useLang();
  const byId = new Map(messages.map((m) => [m.id, m]));

  // Sort: needs reply first, then by category importance, then date desc.
  const order: Classification["category"][] = [
    "interview_invite",
    "offer",
    "recruiter_outreach",
    "interview_followup",
    "rejection",
    "application_confirmation",
    "automated_alert",
    "other",
  ];

  const sorted = [...classifications].sort((a, b) => {
    if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
    return order.indexOf(a.category) - order.indexOf(b.category);
  });

  return (
    <div className="space-y-3">
      {sorted.map((c) => {
        const m = byId.get(c.messageId);
        if (!m) return null;
        const meta = CATEGORY_META[c.category];
        const Icon = meta.icon;
        return (
          <Card key={c.messageId} className="glass">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                      <Icon className="size-3" />
                      {t(`inbox.cat.${c.category}` as Key)}
                    </span>
                    {c.needsReply && (
                      <Badge variant="default">{t("inbox.needsReply")}</Badge>
                    )}
                    {c.matchedCompany && (
                      <Badge variant="outline" className="text-[10px]">
                        {t("inbox.linkedToJob")}: {c.matchedJobTitle ?? c.matchedCompany}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-medium">
                    {m.subject}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {cleanFrom(m.from)} · {formatDate(m.date, lang)}
                  </CardDescription>
                </div>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${m.threadId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title={t("inbox.openInGmail")}
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{c.summary}</p>
              {c.suggestedAction && (
                <p className="text-xs text-muted-foreground">
                  💡 {c.suggestedAction}
                </p>
              )}
              {c.matchedJobId && c.suggestedStatus && (
                <div className="pt-2">
                  <Button size="sm" variant="outline" onClick={() => onApplyStatus(c)}>
                    {t("inbox.applyStatus")}: {t(`status.${c.suggestedStatus}` as Key)}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function cleanFrom(from: string): string {
  // "Name <email@x.com>" → "Name"
  const m = from.match(/^"?([^"<]+?)"?\s*<.+>/);
  return m?.[1]?.trim() ?? from;
}

function formatDate(d: string | undefined, lang: Lang): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(getLocale(lang), {
    month: "short",
    day: "numeric",
  });
}
