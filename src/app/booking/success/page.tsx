import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Container } from "@/components/ui/container";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitStartsAt } from "@/lib/reminders";
import { SuccessActions } from "@/components/booking/SuccessActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Запис підтверджено",
  robots: { index: false, follow: false },
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/?auth=required");
  if (!id) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, master: true, location: true, client: true },
  });

  // IDOR guard — proxy.ts already redirects unauthenticated visitors, but the
  // booking id itself must still belong to the signed-in user. A guest
  // booking (clientId null) can never match a real session.sub, so this also
  // rules out `booking.client` being null below — this page is authenticated-
  // only; a guest sees GuestBookingSuccess instead, client-side, right after
  // the /api/booking/guest response, without a round trip through this route.
  if (!booking || booking.clientId !== session.sub || !booking.client) notFound();

  const start = visitStartsAt(booking.date, booking.timeFrom);
  const end = new Date(start.getTime() + booking.service.durationMinutes * 60 * 1000);
  const whenLabel = format(booking.date, "d MMMM yyyy", { locale: uk });

  return (
    <Container className="flex flex-col items-center gap-10 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-4xl text-accent">
        ✓
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-fg sm:text-4xl">Запис підтверджено!</h1>
        <p className="text-fg-muted">Ми надіслали деталі у Telegram, якщо ваш акаунт з&apos;єднано з ботом.</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-surface p-6 text-left">
        <Row label="Послуга" value={booking.service.name} />
        <Row label="Майстер" value={booking.master.name} />
        <Row label="Дата й час" value={`${whenLabel}, ${booking.timeFrom}`} />
        <Row label="Адреса" value={booking.location.address} />
      </div>

      <SuccessActions
        bookingId={booking.id}
        serviceName={booking.service.name}
        masterName={booking.master.name}
        locationAddress={booking.location.address}
        startIso={start.toISOString()}
        endIso={end.toISOString()}
        telegramLinked={booking.client.telegramId !== null}
      />

      <div className="mt-4 rounded-2xl border border-dashed border-border-strong px-6 py-4 text-sm text-fg-subtle">
        Запросіть подругу та отримайте знижку — скоро тут з&apos;явиться реферальна програма 💛
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-fg-subtle">{label}</span>
      <span className="text-right text-sm text-fg">{value}</span>
    </div>
  );
}
