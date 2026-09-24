"use client";

import { useState } from "react";
import { ButtonAction } from "@/components/ui/button";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Неділя",
  1: "Понеділок",
  2: "Вівторок",
  3: "Середа",
  4: "Четвер",
  5: "П'ятниця",
  6: "Субота",
};

type ScheduleDay = { weekday: number; isWorking: boolean; timeFrom: string | null; timeTo: string | null };

export function AvailabilityEditor({
  locations,
  initialLocationId,
  initialSchedule,
}: {
  locations: { id: string; name: string }[];
  initialLocationId: string | null;
  initialSchedule: ScheduleDay[];
}) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function switchLocation(nextLocationId: string) {
    setLocationId(nextLocationId);
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/master/availability/regular?locationId=${nextLocationId}`);
      const data = await res.json();
      setSchedule(data.schedule);
    } finally {
      setLoading(false);
    }
  }

  function updateDay(weekday: number, patch: Partial<ScheduleDay>) {
    setSchedule((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  async function save() {
    if (!locationId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/master/availability/regular", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          schedule: schedule.map((d) => ({
            weekday: d.weekday,
            isWorking: d.isWorking,
            timeFrom: d.timeFrom ?? undefined,
            timeTo: d.timeTo ?? undefined,
          })),
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Розклад збережено ✓" : data.message ?? "Не вдалося зберегти розклад.");
    } finally {
      setSaving(false);
    }
  }

  if (locations.length === 0) {
    return <p className="text-sm text-fg-subtle">Немає доступних філій.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {locations.length > 1 && (
        <div className="flex gap-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => switchLocation(location.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                location.id === locationId
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border-strong text-fg-muted hover:text-fg"
              }`}
            >
              {location.name}
            </button>
          ))}
        </div>
      )}

      <div className={`flex flex-col gap-2 ${loading ? "opacity-50" : ""}`}>
        {WEEKDAY_ORDER.map((weekday) => {
          const day = schedule.find((d) => d.weekday === weekday);
          if (!day) return null;

          return (
            <div
              key={weekday}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-6"
            >
              <label className="flex w-40 items-center gap-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={day.isWorking}
                  onChange={(e) =>
                    updateDay(weekday, {
                      isWorking: e.target.checked,
                      // The inputs below fall back to 10:00–19:00 visually
                      // when empty — make that the real state too, or saving
                      // a freshly-toggled day fails validation silently.
                      timeFrom: day.timeFrom ?? "10:00",
                      timeTo: day.timeTo ?? "19:00",
                    })
                  }
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                {WEEKDAY_LABELS[weekday]}
              </label>

              {day.isWorking ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.timeFrom ?? "10:00"}
                    onChange={(e) => updateDay(weekday, { timeFrom: e.target.value })}
                    className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
                  />
                  <span className="text-fg-subtle">—</span>
                  <input
                    type="time"
                    value={day.timeTo ?? "19:00"}
                    onChange={(e) => updateDay(weekday, { timeTo: e.target.value })}
                    className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <span className="text-sm text-fg-subtle">Не працюю</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <ButtonAction onClick={save} disabled={saving || loading}>
          {saving ? "Зберігаємо…" : "Зберегти розклад"}
        </ButtonAction>
        {message ? <span className="text-sm text-fg-muted">{message}</span> : null}
      </div>
    </div>
  );
}
