"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminLocationsList as AdminLocationsListData } from "@/lib/admin";
import { Button, ButtonAction } from "@/components/ui/button";

const DAY_LABELS: Record<string, string> = { mon: "Пн", tue: "Вт", wed: "Ср", thu: "Чт", fri: "Пт", sat: "Сб", sun: "Нд" };
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatHours(workingHours: AdminLocationsListData[number]["workingHours"]): string {
  const openDays = DAY_ORDER.filter((k) => workingHours[k as keyof typeof workingHours]?.isOpen);
  if (openDays.length === 0) return "Графік не вказано";
  const first = workingHours[openDays[0] as keyof typeof workingHours];
  const allSame = openDays.every((k) => {
    const d = workingHours[k as keyof typeof workingHours];
    return d.from === first.from && d.to === first.to;
  });
  if (allSame && openDays.length === 7) return `Щодня ${first.from}–${first.to}`;
  return openDays.map((k) => `${DAY_LABELS[k]} ${workingHours[k as keyof typeof workingHours].from}–${workingHours[k as keyof typeof workingHours].to}`).join(", ");
}

export function AdminLocationsList({ initialLocations }: { initialLocations: AdminLocationsListData }) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleActive(id: string, nextActive: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, isActive: nextActive } : l)));
        router.refresh();
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {locations.map((l) => (
        <div key={l.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-fg">{l.name}</span>
              {!l.isActive && (
                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Деактивовано</span>
              )}
            </div>
            <span className="text-sm text-fg-muted">{l.address} · {l.phone}</span>
            <span className="text-xs text-fg-subtle">{formatHours(l.workingHours)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/locations/${l.id}`} variant="outline" size="md">
              Редагувати
            </Button>
            <ButtonAction variant="outline" onClick={() => toggleActive(l.id, !l.isActive)} disabled={togglingId === l.id}>
              {togglingId === l.id ? "…" : l.isActive ? "Деактивувати" : "Активувати"}
            </ButtonAction>
          </div>
        </div>
      ))}
    </div>
  );
}
