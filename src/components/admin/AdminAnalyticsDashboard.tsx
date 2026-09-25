"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminAnalytics } from "@/lib/admin";
import { ButtonAction } from "@/components/ui/button";
import { AdminReportExportModal } from "@/components/admin/AdminReportExportModal";

const ACCENT = "#c9a463";
const FG_MUTED = "#a8a29a";
const BORDER = "#29292d";
const SURFACE = "#1b1b1e";
const FUNNEL_COLORS = ["#c9a463", "#8fae8b", "#c97f7f"];

const MAX_RANGE_DAYS = 365;

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function daysBetween(fromStr: string, toStr: string) {
  return Math.round((new Date(`${toStr}T00:00:00Z`).getTime() - new Date(`${fromStr}T00:00:00Z`).getTime()) / 86400000);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm text-fg-muted">{title}</h2>
      <div className="h-64 w-full">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg shadow-lg">
      {label && <p className="mb-1 text-fg-subtle">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

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

  const days = analytics.days.map((d) => ({ ...d, label: shortDate(d.date) }));
  const funnelData = [
    { name: "Створено", value: analytics.funnel.created },
    { name: "Завершено", value: analytics.funnel.completed },
    { name: "Скасовано", value: analytics.funnel.cancelled },
  ];

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Записи по днях">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" stroke={FG_MUTED} fontSize={12} />
              <YAxis stroke={FG_MUTED} fontSize={12} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER }} />
              <Line type="monotone" dataKey="bookings" name="Записи" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Виручка по днях, грн">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" stroke={FG_MUTED} fontSize={12} />
              <YAxis stroke={FG_MUTED} fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER }} />
              <Line type="monotone" dataKey="revenue" name="Виручка" stroke="#8fae8b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Топ майстрів за кількістю записів">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.topMasters} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" stroke={FG_MUTED} fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke={FG_MUTED} fontSize={12} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE }} />
              <Bar dataKey="count" name="Записів" fill={ACCENT} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Топ послуг за кількістю записів">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.topServices} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" stroke={FG_MUTED} fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke={FG_MUTED} fontSize={12} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE }} />
              <Bar dataKey="count" name="Записів" fill="#8fae8b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Воронка: створено → завершено → скасовано">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTooltip />} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                <LabelList position="right" dataKey="name" fill={FG_MUTED} stroke="none" fontSize={12} />
                <LabelList position="center" dataKey="value" fill="#171208" stroke="none" fontSize={13} fontWeight={600} />
                {funnelData.map((entry, i) => (
                  <Cell key={entry.name} fill={FUNNEL_COLORS[i]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

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
