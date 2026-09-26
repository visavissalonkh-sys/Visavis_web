"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";

const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const mondayFirstStart = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < mondayFirstStart; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  return cells;
}

function MonthGrid({
  year,
  month,
  today,
  workingWeekdays,
  selectedKey,
  onSelect,
}: {
  year: number;
  month: number;
  today: Date;
  workingWeekdays: Set<number>;
  selectedKey: string | null;
  onSelect: (date: Date) => void;
}) {
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);
  const label = format(new Date(Date.UTC(year, month, 1)), "LLLL yyyy", { locale: uk });

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-medium capitalize text-fg">{label}</h4>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-subtle">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const isPast = date < today;
          const isWorkday = workingWeekdays.has(date.getUTCDay());
          const disabled = isPast || !isWorkday;
          const key = toDateKey(date);
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={cn(
                "aspect-square rounded-lg text-sm transition-colors",
                disabled && "text-fg-subtle/40",
                !disabled && !isSelected && "text-fg hover:bg-surface-2",
                isSelected && "bg-accent text-accent-foreground",
              )}
            >
              {date.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AvailabilityResponse = { slots: string[]; nextAvailable: { date: string; time: string } | null };

export function SlotPicker({
  masterId,
  locationId,
  serviceId,
  workingWeekdays,
  onLocked,
}: {
  masterId: string;
  locationId: string;
  serviceId: string;
  workingWeekdays: Set<number>;
  onLocked: (info: { date: string; time: string; lockToken: string; expiresAt: number }) => void;
}) {
  const today = startOfUtcDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [nextAvailable, setNextAvailable] = useState<AvailabilityResponse["nextAvailable"]>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [lockingTime, setLockingTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    // Standard fetch-on-dependency-change effect (react.dev/learn/synchronizing-with-effects#fetching-data):
    // the loading/error flags must be set synchronously before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSlots(true);
    setError(null);

    const params = new URLSearchParams({
      masterId,
      locationId,
      serviceId,
      date: toDateKey(selectedDate),
    });

    fetch(`/api/booking/availability?${params}`)
      .then((res) => res.json())
      .then((data: AvailabilityResponse) => {
        if (cancelled) return;
        setSlots(data.slots);
        setNextAvailable(data.nextAvailable);
      })
      .catch(() => {
        if (!cancelled) setError("Не вдалося завантажити вільний час. Спробуйте ще раз.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, masterId, locationId, serviceId]);

  async function lockSlot(time: string) {
    if (!selectedDate) return;
    setLockingTime(time);
    setError(null);

    try {
      const res = await fetch("/api/booking/lock-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId,
          locationId,
          serviceId,
          date: toDateKey(selectedDate),
          timeFrom: time,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Цей час більше не доступний.");
        setSlots((prev) => (prev ? prev.filter((s) => s !== time) : prev));
        return;
      }

      onLocked({
        date: toDateKey(selectedDate),
        time,
        lockToken: data.lockToken,
        // Not a render-time call — this runs once, inside a click handler,
        // to stamp when this specific lock response actually arrived.
        // eslint-disable-next-line react-hooks/purity
        expiresAt: Date.now() + data.expiresInSeconds * 1000,
      });
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setLockingTime(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <MonthGrid
          year={today.getUTCFullYear()}
          month={today.getUTCMonth()}
          today={today}
          workingWeekdays={workingWeekdays}
          selectedKey={selectedDate ? toDateKey(selectedDate) : null}
          onSelect={setSelectedDate}
        />
        <MonthGrid
          year={nextMonth.getUTCFullYear()}
          month={nextMonth.getUTCMonth()}
          today={today}
          workingWeekdays={workingWeekdays}
          selectedKey={selectedDate ? toDateKey(selectedDate) : null}
          onSelect={setSelectedDate}
        />
      </div>

      {selectedDate ? (
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </div>
          ) : slots && slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((time) => (
                <button
                  key={time}
                  type="button"
                  disabled={lockingTime !== null}
                  onClick={() => lockSlot(time)}
                  className="rounded-lg border border-border-strong py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {lockingTime === time ? "…" : time}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm text-fg-muted">
              <p>Немає вільного часу цього дня.</p>
              {nextAvailable ? (
                <p className="text-accent">
                  Найближчий вільний час: {format(new Date(nextAvailable.date), "d MMMM", { locale: uk })} о{" "}
                  {nextAvailable.time}
                </p>
              ) : null}
            </div>
          )}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
