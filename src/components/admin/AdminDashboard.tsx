"use client";

import { useEffect, useState } from "react";
import type { BookingStatus } from "@prisma/client";
import type { AdminDashboardData, AdminDashboardFilters } from "@/lib/admin";
import { STATUS_CLASSES, STATUS_LABELS } from "@/components/master/status-badge";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

function workloadColor(percentage: number): string {
  if (percentage > 80) return "bg-red-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

function buildQuery(filters: AdminDashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.masterId) params.set("masterId", filters.masterId);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function AdminDashboard({ initialData }: { initialData: AdminDashboardData }) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<AdminDashboardFilters>({});
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  async function refresh(nextFilters: AdminDashboardFilters) {
    const res = await fetch(`/api/admin/dashboard${buildQuery(nextFilters)}`);
    if (res.ok) {
      setData(await res.json());
      setLastUpdated(new Date());
    }
  }

  useEffect(() => {
    const id = setInterval(() => refresh(filters), POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on the same interval, filters read fresh via closure below
  }, [filters]);

  function updateFilter(patch: Partial<AdminDashboardFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    refresh(next);
  }

  const m = data.metrics;

  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Адмін-панель</h1>
        <span className="text-xs text-fg-subtle">Оновлено о {lastUpdated.toLocaleTimeString("uk-UA")}</span>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Записів сьогодні" value={m.todayTotal} sub={`${m.todayConfirmed} підтв. · ${m.todayCancelled} скасовано`} />
        <StatTile label="Записів за тиждень" value={m.weekTotal} />
        <StatTile label="Активних майстрів сьогодні" value={m.activeMastersToday} />
        <StatTile label="Нових клієнтів за 7 днів" value={m.newClientsLast7Days} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Записи прямо зараз</h2>

        <div className="flex flex-wrap gap-2">
          <select
            value={filters.locationId ?? ""}
            onChange={(e) => updateFilter({ locationId: e.target.value || undefined })}
            className="rounded-full border border-border-strong bg-surface px-4 py-1.5 text-sm text-fg-muted"
          >
            <option value="">Усі філії</option>
            {data.filterOptions.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={filters.masterId ?? ""}
            onChange={(e) => updateFilter({ masterId: e.target.value || undefined })}
            className="rounded-full border border-border-strong bg-surface px-4 py-1.5 text-sm text-fg-muted"
          >
            <option value="">Усі майстри</option>
            {data.filterOptions.masters.map((mst) => (
              <option key={mst.id} value={mst.id}>
                {mst.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status ?? ""}
            onChange={(e) => updateFilter({ status: (e.target.value || undefined) as BookingStatus | undefined })}
            className="rounded-full border border-border-strong bg-surface px-4 py-1.5 text-sm text-fg-muted"
          >
            <option value="">Усі статуси</option>
            {data.filterOptions.statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        {data.todayBookings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-fg-muted">
            Немає записів за цим фільтром.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <th className="p-4">Час</th>
                  <th className="p-4">Клієнт</th>
                  <th className="p-4">Майстер</th>
                  <th className="p-4">Послуга</th>
                  <th className="p-4">Філія</th>
                  <th className="p-4">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.todayBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4 text-fg">{b.timeFrom}</td>
                    <td className="p-4 text-fg-muted">
                      {b.clientName ?? "Клієнт"} · {b.clientPhone}
                    </td>
                    <td className="p-4 text-fg-muted">{b.masterName}</td>
                    <td className="p-4 text-fg-muted">{b.serviceName}</td>
                    <td className="p-4 text-fg-muted">{b.locationName}</td>
                    <td className="p-4">
                      <span className={cn("rounded-full border px-3 py-1 text-xs", STATUS_CLASSES[b.status])}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Завантаження майстрів сьогодні</h2>
        <div className="flex flex-col gap-3">
          {data.masterWorkload.map((w) => (
            <div key={w.masterId} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <span className="w-40 shrink-0 truncate text-sm text-fg">{w.masterName}</span>
              {w.isDayOff ? (
                <span className="text-xs text-fg-subtle">⏸ Вихідний</span>
              ) : (
                <>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full transition-all", workloadColor(w.percentage))}
                      style={{ width: `${w.percentage}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-fg-subtle">
                    {w.bookedSlots} / {w.totalSlots}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Останні дії</h2>
        {data.recentActions.length === 0 ? (
          <p className="text-sm text-fg-subtle">Ще немає дій в аудит-логу.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {data.recentActions.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="text-fg">
                  <span className="text-fg-muted">{a.actorName}</span> — {a.action}
                  <span className="text-fg-subtle"> ({a.entityType})</span>
                </span>
                <span className="text-xs text-fg-subtle">{new Date(a.createdAt).toLocaleString("uk-UA")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="font-display text-3xl text-fg">{value}</div>
      <div className="mt-1 text-xs text-fg-subtle">{label}</div>
      {sub && <div className="mt-1 text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}
