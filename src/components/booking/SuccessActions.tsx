"use client";

import { buildIcsFile, downloadIcsFile } from "@/lib/ics";
import { Button, ButtonAction } from "@/components/ui/button";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "visavis_bot";

export function SuccessActions({
  bookingId,
  serviceName,
  masterName,
  locationAddress,
  startIso,
  endIso,
  telegramLinked,
}: {
  bookingId: string;
  serviceName: string;
  masterName: string;
  locationAddress: string;
  startIso: string;
  endIso: string;
  telegramLinked: boolean;
}) {
  function handleAddToCalendar() {
    const ics = buildIcsFile({
      uid: bookingId,
      title: `${serviceName} — Visavis`,
      description: `Запис до майстра ${masterName}`,
      location: locationAddress,
      start: new Date(startIso),
      end: new Date(endIso),
    });
    downloadIcsFile("visavis-booking.ics", ics);
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ButtonAction variant="outline" onClick={handleAddToCalendar}>
        Додати в календар
      </ButtonAction>
      <Button href="/account">Перейти до кабінету</Button>
      {!telegramLinked ? (
        <a
          href={`https://t.me/${BOT_USERNAME}?start=link`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-accent hover:text-accent-hover"
        >
          Написати боту (нагадування)
        </a>
      ) : null}
    </div>
  );
}
