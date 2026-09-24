"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ButtonAction } from "@/components/ui/button";

type OverrideType = "day_off" | "extra_slot" | "blocked_range";
type Override = { id: string; date: string; type: OverrideType; timeFrom: string | null; timeTo: string | null; note: string | null };

const TYPE_LABELS: Record<OverrideType, string> = {
  day_off: "Вихідний день",
  blocked_range: "Заблоковано",
  extra_slot: "Додатковий час",
};

const TYPE_DOT: Record<OverrideType, string> = {
  day_off: "bg-red-500",
  blocked_range: "bg-red-400",
  extra_slot: "bg-green-500",
};

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

const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export function OverrideCalendar({ initialOverrides }: { initialOverrides: Override[] }) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [type, setType] = useState<OverrideType>("day_off");
  const [timeFrom, setTimeFrom] = useState("12:00");
  const [timeTo, setTimeTo] = useState("13:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfUtcDay(new Date());
  const months = useMemo(
    () => [0, 1].map((i) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const overridesByDate = useMemo(() => {
    const map = new Map<string, Override[]>();
    for (const o of overrides) {
      map.set(o.date, [...(map.get(o.date) ?? []), o]);
    }
    return map;
  }, [overrides]);

  async function submit() {
    if (!selectedDate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/master/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          type,
          timeFrom: type === "day_off" ? undefined : timeFrom,
          timeTo: type === "day_off" ? undefined : timeTo,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти зміну.");
        return;
      }
      setOverrides((prev) => [
        ...prev,
        { id: data.id, date: selectedDate, type, timeFrom: type === "day_off" ? null : timeFrom, timeTo: type === "day_off" ? null : timeTo, note: note.trim() || null },
      ]);
      setSelectedDate(null);
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/master/availability/overrides/${id}`, { method: "DELETE" });
    setOverrides((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 sm:grid-cols-2">
        {months.map((month) => {
          const cells = getMonthGrid(month.getUTCFullYear(), month.getUTCMonth());
          const label = format(month, "LLLL yyyy", { locale: uk });

          return (
            <div key={label} className="flex flex-col gap-3">
              <h4 className="text-sm font-medium capitalize text-fg">{label}</h4>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-subtle">
                {WEEKDAY_HEADERS.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const key = toDateKey(date);
                  const isPast = date < today;
                  const dayOverrides = overridesByDate.get(key) ?? [];
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "relative aspect-square rounded-lg text-sm transition-colors",
                        isPast && "text-fg-subtle/40",
                        !isPast && !isSelected && "text-fg hover:bg-surface-2",
                        isSelected && "bg-accent text-accent-foreground",
                      )}
                    >
                      {date.getUTCDate()}
                      {dayOverrides.length > 0 && (
                        <span
                          className={cn(
                            "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                            TYPE_DOT[dayOverrides[0].type],
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <span className="text-sm text-fg">
            {format(new Date(`${selectedDate}T00:00:00.000Z`), "d MMMM yyyy", { locale: uk })}
          </span>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as OverrideType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  type === t ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-fg-muted",
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {type !== "day_off" && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
              />
              <span className="text-fg-subtle">—</span>
              <input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
              />
            </div>
          )}

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Причина (необов'язково, лише для вас/адміністрації)"
            className="rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex gap-3">
            <ButtonAction onClick={submit} disabled={saving}>
              {saving ? "…" : "Підтвердити"}
            </ButtonAction>
            <ButtonAction variant="ghost" onClick={() => setSelectedDate(null)}>
              Скасувати
            </ButtonAction>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">Заплановані зміни</span>
        {overrides.length === 0 ? (
          <p className="text-sm text-fg-subtle">Немає запланованих змін доступності.</p>
        ) : (
          overrides
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm"
              >
                <div className="flex flex-col">
                  <span className="text-fg">
                    {format(new Date(`${o.date}T00:00:00.000Z`), "d MMMM yyyy", { locale: uk })} — {TYPE_LABELS[o.type]}
                    {o.timeFrom && o.timeTo ? ` (${o.timeFrom}–${o.timeTo})` : ""}
                  </span>
                  {o.note ? <span className="text-xs text-fg-subtle">{o.note}</span> : null}
                </div>
                <button type="button" onClick={() => remove(o.id)} className="text-fg-subtle hover:text-red-400">
                  Видалити
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
