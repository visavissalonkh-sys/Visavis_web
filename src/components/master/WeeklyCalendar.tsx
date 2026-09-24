"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";

type SlotStatus = "booked" | "available" | "blocked" | "off";
type Slot = { time: string; status: SlotStatus; booking?: { id: string; serviceName: string; clientName: string | null } };
type Day = { date: string; weekday: number; slots: Slot[] };
type ScheduleResponse = { locations: { id: string; name: string }[]; locationId: string | null; weekStart: string; days: Day[] };

const STATUS_STYLES: Record<SlotStatus, string> = {
  booked: "bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30 cursor-pointer",
  available: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  blocked: "bg-red-500/15 border-red-500/30 text-red-300",
  off: "bg-surface-2 border-border text-fg-subtle/40",
};

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function WeeklyCalendar({ initial }: { initial: ScheduleResponse }) {
  const [data, setData] = useState(initial);
  const [locationId, setLocationId] = useState(initial.locationId);
  const [weekStart, setWeekStart] = useState(initial.weekStart);
  const [loading, setLoading] = useState(false);
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  useEffect(() => {
    if (weekStart === initial.weekStart && locationId === initial.locationId) return;
    let cancelled = false;
    // Standard fetch-on-dependency-change effect; the loading flag must be
    // set synchronously before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({ week: weekStart });
    if (locationId) params.set("locationId", locationId);
    fetch(`/api/master/schedule?${params}`)
      .then((res) => res.json())
      .then((next: ScheduleResponse) => {
        if (!cancelled) setData(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, locationId]);

  const weekLabel = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    const end = addDaysUtc(start, 6);
    return `${format(start, "d MMM", { locale: uk })} – ${format(end, "d MMM yyyy", { locale: uk })}`;
  }, [weekStart]);

  function shiftWeek(deltaDays: number) {
    const next = addDaysUtc(new Date(`${weekStart}T00:00:00.000Z`), deltaDays);
    setWeekStart(next.toISOString().slice(0, 10));
  }

  if (data.locations.length === 0) {
    return <p className="text-sm text-fg-subtle">Немає доступних філій.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {data.locations.length > 1 && (
          <div className="flex gap-2">
            {data.locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setLocationId(location.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  location.id === (locationId ?? data.locationId)
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border-strong text-fg-muted hover:text-fg",
                )}
              >
                {location.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => shiftWeek(-7)} className="text-fg-muted hover:text-fg">
            ←
          </button>
          <span className="text-sm text-fg">{weekLabel}</span>
          <button type="button" onClick={() => shiftWeek(7)} className="text-fg-muted hover:text-fg">
            →
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-fg-subtle">
        <Legend colorClass="bg-green-500/40" label="Запис" />
        <Legend colorClass="bg-blue-500/30" label="Вільно" />
        <Legend colorClass="bg-surface-2 border border-border" label="Неробочий час" />
        <Legend colorClass="bg-red-500/30" label="Заблоковано" />
      </div>

      {/* Desktop: 7-column grid */}
      <div className={cn("hidden overflow-x-auto lg:block", loading && "opacity-50")}>
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {data.days.map((day) => (
            <DayColumn key={day.date} day={day} />
          ))}
        </div>
      </div>

      {/* Mobile: one day at a time */}
      <div className={cn("flex flex-col gap-4 lg:hidden", loading && "opacity-50")}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileDayIndex((i) => Math.max(0, i - 1))}
            disabled={mobileDayIndex === 0}
            className="text-fg-muted disabled:opacity-30"
          >
            ← Попередній день
          </button>
          <button
            type="button"
            onClick={() => setMobileDayIndex((i) => Math.min(6, i + 1))}
            disabled={mobileDayIndex === 6}
            className="text-fg-muted disabled:opacity-30"
          >
            Наступний день →
          </button>
        </div>
        {data.days[mobileDayIndex] && <DayColumn day={data.days[mobileDayIndex]} wide />}
      </div>
    </div>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", colorClass)} />
      {label}
    </span>
  );
}

function DayColumn({ day, wide }: { day: Day; wide?: boolean }) {
  const label = format(new Date(`${day.date}T00:00:00.000Z`), "EEEEEE, d MMM", { locale: uk });

  return (
    <div className="flex flex-col gap-1">
      <div className="pb-2 text-center text-xs capitalize text-fg-subtle">{label}</div>
      <div className={cn("flex flex-col gap-0.5", wide && "gap-1")}>
        {day.slots.map((slot) => {
          const content = (
            <div
              className={cn(
                "rounded border px-2 py-1 text-[11px] leading-tight transition-colors",
                STATUS_STYLES[slot.status],
                wide && "flex items-center justify-between px-3 py-2 text-sm",
              )}
            >
              <span>{slot.time}</span>
              {slot.status === "booked" && slot.booking && (
                <span className={cn("block truncate", wide && "ml-3")}>
                  {slot.booking.serviceName}
                  {wide ? ` — ${slot.booking.clientName ?? "Клієнт"}` : ""}
                </span>
              )}
            </div>
          );

          if (slot.status === "booked" && slot.booking) {
            return (
              <Link key={slot.time} href={`/master/bookings/${slot.booking.id}`}>
                {content}
              </Link>
            );
          }
          return <div key={slot.time}>{content}</div>;
        })}
      </div>
    </div>
  );
}
