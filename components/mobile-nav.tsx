"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Plus,
  KanbanSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

const ITEMS: {
  href: string;
  key: Key;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}[] = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/jobs", key: "nav.jobs", icon: Briefcase },
  { href: "/jobs/new", key: "jobs.add", icon: Plus },
  { href: "/applications", key: "nav.applications", icon: KanbanSquare },
  { href: "/agent", key: "nav.agent", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-sidebar/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {ITEMS.map(({ href, key, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const isAdd = href === "/jobs/new";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 min-w-[56px] py-1 rounded-xl transition-colors",
                isAdd &&
                  "bg-primary/90 text-primary-foreground rounded-full size-10 -mt-4 shadow-lg shadow-primary/30 hover:bg-primary",
                !isAdd && active
                  ? "text-primary"
                  : !isAdd
                  ? "text-muted-foreground hover:text-foreground"
                  : "",
              )}
            >
              <Icon className={cn("size-5", isAdd && "size-5")} />
              {!isAdd && (
                <span className="text-[9px] leading-tight">{t(key)}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
