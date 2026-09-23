"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { DashboardData } from "@/lib/master";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

function nowHHMM(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function MasterDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [clock, setClock] = useState(nowHHMM());
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/master/dashboard");
        if (res.ok) setData(await res.json());
      } catch {
        // silent — next poll will retry
      }
    }, POLL_INTERVAL_MS);
    const tick = setInterval(() => setClock(nowHHMM()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  async function refresh() {
    const res = await fetch("/api/master/dashboard");
    if (res.ok) setData(await res.json());
  }

  async function act(bookingId: string, action: "confirm" | "reject" | "complete") {
    setPendingAction(bookingId + action);
    try {
      await fetch(`/api/master/bookings/${bookingId}/${action}`, { method: "PATCH" });
      await refresh();
    } finally {
      setPendingAction(null);
    }
  }

  const todayLabel = format(new Date(`${data.today.date}T00:00:00.000Z`), "EEEE, d MMMM", { locale: uk });

  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-fg-subtle">{clock}</span>
        <h1 className="font-display text-2xl capitalize text-fg sm:text-3xl">{todayLabel}</h1>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Сьогодні</h2>

        {data.today.bookings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-fg-muted">
            Сьогодні вільний день 🎉
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.today.bookings.map((booking) => {
              const isPast = booking.timeTo <= clock;
              const isCurrent = booking.timeFrom <= clock && clock < booking.timeTo;

              return (
                <div
                  key={booking.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between",
                    isCurrent && "border-accent bg-accent-soft",
                    !isCurrent && !isPast && "border-border bg-surface",
                    isPast && "border-border bg-surface/50 opacity-60",
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-fg">
                      {booking.timeFrom} — {booking.serviceName}
                    </span>
                    <span className="text-sm text-fg-muted">
                      {booking.clientName ?? "Клієнт"} · {booking.clientPhone}
                    </span>
                    <span className="text-xs text-fg-subtle">{booking.locationName}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/master/bookings/${booking.id}`}
                      className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      Детальніше
                    </Link>

                    {booking.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={pendingAction === booking.id + "confirm"}
                          onClick={() => act(booking.id, "confirm")}
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                        >
                          Підтвердити
                        </button>
                        <button
                          type="button"
                          disabled={pendingAction === booking.id + "reject"}
                          onClick={() => act(booking.id, "reject")}
                          className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-fg-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                        >
                          Відхилити
                        </button>
                      </>
                    )}

                    {booking.status === "confirmed" && (
                      <>
                        <button
                          type="button"
                          disabled={pendingAction === booking.id + "complete"}
                          onClick={() => act(booking.id, "complete")}
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                        >
                          Завершено
                        </button>
                        <button
                          type="button"
                          disabled={pendingAction === booking.id + "reject"}
                          onClick={() => act(booking.id, "reject")}
                          className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-fg-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                        >
                          Скасувати
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Найближчі записи</h2>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-fg-subtle">Немає записів на найближчі 7 днів.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.upcoming.map((day) => (
              <div key={day.date} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="text-sm capitalize text-fg">
                  {format(new Date(`${day.date}T00:00:00.000Z`), "EEEE, d MMMM", { locale: uk })}
                </div>
                <div className="text-xs text-fg-subtle">{day.count} записів</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Статистика тижня</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Записів" value={data.weekStats.total} />
          <StatTile label="Завершено" value={data.weekStats.completed} />
          <StatTile label="Скасовано" value={data.weekStats.cancelled} />
          <StatTile
            label="Топ послуга"
            value={data.weekStats.topService ? data.weekStats.topService.name : "—"}
            isText
          />
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={cn("font-display text-fg", isText ? "text-base" : "text-3xl")}>{value}</div>
      <div className="mt-1 text-xs text-fg-subtle">{label}</div>
    </div>
  );
}
