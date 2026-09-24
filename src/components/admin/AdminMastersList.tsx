"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminMastersList as AdminMastersListData } from "@/lib/admin";
import { Button, ButtonAction } from "@/components/ui/button";
import { DeactivateMasterModal } from "@/components/admin/DeactivateMasterModal";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function AdminMastersList({ initialMasters }: { initialMasters: AdminMastersListData }) {
  const router = useRouter();
  const [masters, setMasters] = useState(initialMasters);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  async function reactivate(id: string) {
    setReactivatingId(id);
    try {
      const res = await fetch(`/api/admin/masters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        setMasters((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: true } : m)));
        router.refresh();
      }
    } finally {
      setReactivatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {masters.map((m) => (
        <div
          key={m.id}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-accent">{initials(m.name)}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-fg">{m.name}</span>
                {!m.isActive && (
                  <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                    Деактивовано
                  </span>
                )}
              </div>
              <span className="text-sm text-fg-muted">{m.specialtyNames.join(", ") || "—"}</span>
              <span className="text-xs text-fg-subtle">
                {m.locationNames.join(", ") || "—"} · {m.bookingsThisMonth} записів цього місяця · ★ {m.rating.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/masters/${m.id}`} variant="outline" size="md">
              Редагувати
            </Button>
            {m.isActive ? (
              <ButtonAction
                variant="outline"
                className="hover:border-red-400 hover:text-red-400"
                onClick={() => setDeactivateTarget({ id: m.id, name: m.name })}
              >
                Деактивувати
              </ButtonAction>
            ) : (
              <ButtonAction variant="outline" onClick={() => reactivate(m.id)} disabled={reactivatingId === m.id}>
                {reactivatingId === m.id ? "…" : "Активувати"}
              </ButtonAction>
            )}
          </div>
        </div>
      ))}

      {deactivateTarget && (
        <DeactivateMasterModal
          masterId={deactivateTarget.id}
          masterName={deactivateTarget.name}
          onClose={() => setDeactivateTarget(null)}
          onDeactivated={() => {
            setMasters((prev) => prev.map((m) => (m.id === deactivateTarget.id ? { ...m, isActive: false } : m)));
            setDeactivateTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
