"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  KanbanSquare,
  Sparkles,
  Settings,
  Plug,
  HelpCircle,
  Inbox,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";
import { store } from "@/lib/storage";
import type { StoredJob } from "@/lib/storage";

type CommandItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
};

export function CommandPalette() {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) setJobs(store.getJobs());
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelected(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const NAV_ITEMS: CommandItem[] = [
    { id: "nav-dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard className="size-4" />, href: "/" },
    { id: "nav-cv", label: t("nav.cv"), icon: <FileText className="size-4" />, href: "/cv" },
    { id: "nav-jobs", label: t("nav.jobs"), icon: <Briefcase className="size-4" />, href: "/jobs" },
    { id: "nav-add", label: t("jobs.add"), icon: <Plus className="size-4" />, href: "/jobs/new", badge: "new" },
    { id: "nav-apps", label: t("nav.applications"), icon: <KanbanSquare className="size-4" />, href: "/applications" },
    { id: "nav-agent", label: t("nav.agent"), icon: <Sparkles className="size-4" />, href: "/agent" },
    { id: "nav-connectors", label: t("nav.connectors"), icon: <Plug className="size-4" />, href: "/connectors" },
    { id: "nav-inbox", label: t("nav.inbox"), icon: <Inbox className="size-4" />, href: "/inbox" },
    { id: "nav-settings", label: t("nav.settings"), icon: <Settings className="size-4" />, href: "/settings" },
    { id: "nav-help", label: t("nav.help"), icon: <HelpCircle className="size-4" />, href: "/help" },
  ];

  const JOB_ITEMS: CommandItem[] = jobs.map((j) => ({
    id: `job-${j.id}`,
    label: j.parsed.title,
    sublabel: j.parsed.company,
    icon: <Briefcase className="size-4 text-muted-foreground" />,
    href: `/jobs/${j.id}`,
    badge: j.match ? String(j.match.score) : undefined,
  }));

  const allItems = query.trim() ? [...NAV_ITEMS, ...JOB_ITEMS] : NAV_ITEMS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, jobs]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[selected];
        if (item) navigate(item.href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected, filtered]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden" aria-describedby={undefined}>
          <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("jobs.filter.search")}...`}
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 h-auto text-sm"
            />
            <kbd className="shrink-0 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              Esc
            </kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("jobs.filter.empty")}
              </p>
            )}
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors",
                  idx === selected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelected(idx)}
              >
                <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-muted-foreground truncate block">{item.sublabel}</span>
                  )}
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-border/50 px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span>↑↓ ניווט</span>
            <span>↵ בחר</span>
            <span className="ms-auto">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">⌘K</kbd>
              {" "}לסגור
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
