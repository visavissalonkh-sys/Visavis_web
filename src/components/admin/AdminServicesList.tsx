"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AdminServicesList as AdminServicesListData } from "@/lib/admin";
import { categories } from "@/lib/data/services";
import { ButtonAction } from "@/components/ui/button";

const CATEGORY_NAMES = new Map(categories.map((c) => [c.slug, c.name]));

function InlinePriceCell({
  serviceId,
  priceFrom,
  priceTo,
  onSaved,
}: {
  serviceId: string;
  priceFrom: number;
  priceTo: number | null;
  onSaved: (priceFrom: number, priceTo: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState(String(priceFrom));
  const [to, setTo] = useState(priceTo !== null ? String(priceTo) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const parsedFrom = Number(from);
    const parsedTo = to.trim() ? Number(to) : null;
    if (Number.isNaN(parsedFrom) || (parsedTo !== null && Number.isNaN(parsedTo))) {
      setError("Невірне число");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceFrom: parsedFrom, priceTo: parsedTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Помилка");
        return;
      }
      onSaved(parsedFrom, parsedTo);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-fg underline decoration-dotted hover:text-accent">
        {priceFrom}
        {priceTo ? `–${priceTo}` : ""} ₴
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-16 rounded-lg border border-border-strong bg-surface-2 px-2 py-1 text-xs text-fg"
        />
        <span className="text-fg-subtle">–</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="—"
          className="w-16 rounded-lg border border-border-strong bg-surface-2 px-2 py-1 text-xs text-fg"
        />
        <button type="button" onClick={save} disabled={saving} className="text-xs text-accent hover:text-accent-hover">
          ✓
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-fg-subtle hover:text-fg">
          ✕
        </button>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function AdminServicesList({ initialServices }: { initialServices: AdminServicesListData }) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof services>();
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return map;
  }, [services]);

  async function toggleActive(id: string, nextActive: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s)));
        router.refresh();
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {[...byCategory.entries()].map(([category, categoryServices]) => (
        <div key={category} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">
            {CATEGORY_NAMES.get(category) ?? category}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <th className="p-4">Назва</th>
                  <th className="p-4">Тривалість</th>
                  <th className="p-4">Ціна</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Дії</th>
                </tr>
              </thead>
              <tbody>
                {categoryServices.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4 text-fg">{s.name}</td>
                    <td className="p-4 text-fg-muted">{s.durationMinutes} хв</td>
                    <td className="p-4">
                      <InlinePriceCell
                        serviceId={s.id}
                        priceFrom={s.priceFrom}
                        priceTo={s.priceTo}
                        onSaved={(priceFrom, priceTo) =>
                          setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, priceFrom, priceTo } : x)))
                        }
                      />
                    </td>
                    <td className="p-4">
                      {s.isActive ? (
                        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                          Активна
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                          Деактивована
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link href={`/admin/services/${s.id}`} className="text-xs text-fg-muted hover:text-fg">
                          Редагувати
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleActive(s.id, !s.isActive)}
                          disabled={togglingId === s.id}
                          className="text-xs text-fg-muted hover:text-fg disabled:opacity-50"
                        >
                          {s.isActive ? "Деактивувати" : "Активувати"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
