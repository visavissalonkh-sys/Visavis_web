"use client";

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

const ACCENT = "#c9a463";
const FG_MUTED = "#a8a29a";
const BORDER = "#29292d";
const SURFACE = "#1b1b1e";
const FUNNEL_COLORS = ["#c9a463", "#8fae8b", "#c97f7f"];

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
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

/** The actual recharts rendering, split out so the dashboard shell (date
 * picker, export button) can render immediately while this — and the
 * sizeable recharts/d3 bundle it pulls in — loads separately via
 * next/dynamic(..., { ssr: false }) in AdminAnalyticsDashboard. */
export function AdminAnalyticsCharts({ analytics }: { analytics: AdminAnalytics }) {
  const days = analytics.days.map((d) => ({ ...d, label: shortDate(d.date) }));
  const funnelData = [
    { name: "Створено", value: analytics.funnel.created },
    { name: "Завершено", value: analytics.funnel.completed },
    { name: "Скасовано", value: analytics.funnel.cancelled },
  ];

  return (
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
  );
}
