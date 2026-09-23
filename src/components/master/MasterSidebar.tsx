"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MASTER_NAV_ITEMS } from "@/components/master/nav-items";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function MasterSidebar({ masterName }: { masterName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-3 border-b border-border p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-sm text-accent">
          {initials(masterName)}
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-fg">{masterName}</span>
          <span className="text-xs text-fg-subtle">Кабінет майстра</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {MASTER_NAV_ITEMS.map((item) => {
          const isActive = item.href === "/master" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                isActive ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          Вийти
        </button>
      </div>
    </aside>
  );
}
