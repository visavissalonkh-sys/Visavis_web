"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { AdminAnalytics } from "@/lib/admin";
import { ButtonAction } from "@/components/ui/button";
import { AdminReportExportModal } from "@/components/admin/AdminReportExportModal";

const MAX_RANGE_DAYS = 365;

function daysBetween(fromStr: string, toStr: string) {
  return Math.round((new Date(`${toStr}T00:00:00Z`).getTime() - new Date(`${fromStr}T00:00:00Z`).getTime()) / 86400000);
}

// recharts (+ the d3 modules it pulls in) is a genuinely heavy bundle for a
// single admin-only page — load it only on the client, only once this
// component actually mounts, instead of shipping it in every /admin/analytics
// page load's initial JS. The skeleton keeps the 5-chart grid's layout
// height stable (no CLS) while the real bundle streams in.
const AdminAnalyticsCharts = dynamic(
  () => import("@/components/admin/AdminAnalyticsCharts").then((mod) => mod.AdminAnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex h-[17.5rem] flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
            <div className="flex-1 animate-pulse rounded-xl bg-surface-2" />
          </div>
        ))}
      </div>
    ),
  },
);

export function AdminAnalyticsDashboard({
  initialFrom,
  initialTo,
  initialAnalytics,
  masters,
  locations,
  statuses,
}: {
  initialFrom: string;
  initialTo: string;
  initialAnalytics: AdminAnalytics;
  masters: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  statuses: string[];
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  async function loadRange(nextFrom: string, nextTo: string) {
    if (nextFrom > nextTo) {
      setError("«Від» не може бути пізніше за «до».");
      return;
    }
    if (daysBetween(nextFrom, nextTo) > MAX_RANGE_DAYS) {
      setError("Максимальний період — 365 днів.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?from=${nextFrom}&to=${nextTo}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Не вдалося завантажити аналітику.");
        return;
      }
      setAnalytics(data);
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  function applyRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    loadRange(nextFrom, nextTo);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-subtle">Від</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => applyRange(e.target.value, to)}
              className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-subtle">До</label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => applyRange(from, e.target.value)}
              className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
            />
          </div>
        </div>
        <ButtonAction onClick={() => setExportOpen(true)}>Завантажити звіт</ButtonAction>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-fg-subtle">Оновлюємо…</p>}

      <AdminAnalyticsCharts analytics={analytics} />

      {exportOpen && (
        <AdminReportExportModal
          initialFrom={from}
          initialTo={to}
          masters={masters}
          locations={locations}
          statuses={statuses}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
