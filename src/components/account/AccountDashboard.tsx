import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { DashboardData } from "@/lib/account";
import { STATUS_CLASSES, STATUS_LABELS } from "@/components/master/status-badge";
import { CountdownTimer } from "@/components/account/CountdownTimer";
import { cn } from "@/lib/utils";

function pluralizeUk(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

function fullDateUk(dateOnly: string, time: string): string {
  const label = format(new Date(`${dateOnly}T00:00:00.000Z`), "EEEE, d MMMM", { locale: uk });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} о ${time}`;
}

export function AccountDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-10 p-6 sm:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-fg sm:text-3xl">
          {data.firstName ? `Вітаємо, ${data.firstName} 👋` : "Вітаємо 👋"}
        </h1>
        {data.memberSinceMonths > 0 && (
          <p className="text-sm text-fg-subtle">
            З нами вже {data.memberSinceMonths}{" "}
            {pluralizeUk(data.memberSinceMonths, "місяць", "місяці", "місяців")} · {data.completedVisits}{" "}
            {pluralizeUk(data.completedVisits, "візит", "візити", "візитів")}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Наступний візит</h2>

        {data.nextBooking ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-4">
              {data.nextBooking.master.avatarUrl ? (
                <Image
                  src={data.nextBooking.master.avatarUrl}
                  alt={data.nextBooking.master.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-accent">
                  {data.nextBooking.master.name.slice(0, 1)}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-fg">{fullDateUk(data.nextBooking.date, data.nextBooking.timeFrom)}</span>
                <span className="text-sm text-fg-muted">
                  {data.nextBooking.serviceName} · {data.nextBooking.master.name}
                </span>
                <span className="text-xs text-fg-subtle">{data.nextBooking.locationAddress}</span>
              </div>
            </div>

            <div className="text-sm text-accent">
              <CountdownTimer targetIso={data.nextBooking.visitAtIso} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/account/bookings/${data.nextBooking.id}`}
                className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-fg-muted transition-colors hover:border-red-400 hover:text-red-400"
              >
                Скасувати
              </Link>
              <Link
                href={`/booking?masterId=${data.nextBooking.master.id}&serviceId=${data.nextBooking.serviceId}`}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Перенести
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-10 text-center">
            <span aria-hidden className="text-4xl">
              💅
            </span>
            <p className="text-fg-muted">Запишіться до улюбленого майстра</p>
            <Link
              href="/booking"
              className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Записатися
            </Link>
          </div>
        )}
      </section>

      {data.recentVisits.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Останні відвідування</h2>
          <div className="flex flex-col gap-3">
            {data.recentVisits.map((visit) => (
              <div
                key={visit.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-fg">
                    {visit.date.split("-").reverse().join(".")} — {visit.serviceName}
                  </span>
                  <span className="text-sm text-fg-muted">{visit.masterName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-3 py-1 text-xs", STATUS_CLASSES[visit.status])}>
                    {STATUS_LABELS[visit.status] ?? visit.status}
                  </span>
                  {visit.status === "completed" && !visit.hasReview && (
                    <Link
                      href={`/account/bookings/${visit.id}`}
                      className="rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent transition-colors hover:bg-accent-soft/70"
                    >
                      Залишити відгук
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!data.telegramLinked && (
        <section className="flex flex-col gap-3 rounded-2xl border border-accent-border bg-accent-soft p-6">
          <p className="text-sm text-fg">🔔 Підключіть Telegram для нагадувань</p>
          <p className="text-sm text-fg-muted">Ми нагадаємо про ваш візит за день та за 2 години</p>
          <Link
            href="/account/telegram"
            className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Підключити Telegram
          </Link>
        </section>
      )}
    </div>
  );
}
