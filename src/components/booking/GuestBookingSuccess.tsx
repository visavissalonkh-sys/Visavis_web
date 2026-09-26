"use client";

import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "salon_visavis_bot";

export function GuestBookingSuccess({
  serviceName,
  masterName,
  locationAddress,
  date,
  time,
}: {
  serviceName: string;
  masterName: string;
  locationAddress: string;
  date: string;
  time: string;
}) {
  const dateLabel = format(new Date(`${date}T00:00:00.000Z`), "EEEE, d MMMM", { locale: uk });
  const capitalizedDateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-3xl text-accent">
        ✓
      </div>
      <h2 className="font-display text-2xl text-fg sm:text-3xl">Запис створено!</h2>

      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left">
        <Row icon="📅" value={`${capitalizedDateLabel} о ${time}`} />
        <Row icon="💅" value={serviceName} />
        <Row icon="👤" value={`Майстер: ${masterName}`} />
        <Row icon="📍" value={locationAddress} />
      </div>

      <p className="text-sm text-fg-muted">Ми зв&apos;яжемось з вами для підтвердження запису.</p>

      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-accent-border bg-accent-soft p-6 text-center">
        <span className="text-sm font-medium text-fg">
          🔔 Хочете отримувати нагадування і відстежувати свої записи?
        </span>
        <a
          href={`https://t.me/${BOT_USERNAME}?start=link`}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          📱 Зареєструватись через Telegram
        </a>
        <p className="text-xs text-fg-subtle">
          Після реєстрації цей запис автоматично з&apos;явиться у вашому кабінеті 🎉
        </p>
      </div>

      <Button href="/" variant="outline">
        На головну
      </Button>
    </div>
  );
}

function Row({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-3 text-sm text-fg last:border-0 last:pb-0">
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  );
}
