import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBookingsList, type AccountBookingsTab } from "@/lib/account";
import { AccountBookingCard } from "@/components/account/AccountBookingCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Мої записи",
  robots: { index: false, follow: false },
};

const TABS: { value: AccountBookingsTab; label: string }[] = [
  { value: "upcoming", label: "Майбутні" },
  { value: "past", label: "Минулі" },
];

export default async function AccountBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { tab: tabParam, page: pageParam } = await searchParams;
  const tab: AccountBookingsTab = tabParam === "past" ? "past" : "upcoming";
  const page = pageParam ? Math.max(1, Number(pageParam)) : 1;

  const session = await getSession();
  const data = await getBookingsList({ clientId: session!.sub, tab, page });

  function tabHref(nextTab: AccountBookingsTab) {
    return `/account/bookings?tab=${nextTab}`;
  }

  function pageHref(nextPage: number) {
    return `/account/bookings?tab=${tab}&page=${nextPage}`;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Мої записи</h1>
        <p className="mt-1 text-sm text-fg-muted">Усього: {data.total}</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={tabHref(t.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              tab === t.value
                ? "border-accent bg-accent-soft text-accent"
                : "border-border-strong text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {data.bookings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-fg-muted">
          {tab === "upcoming" ? "Немає майбутніх записів." : "Записів поки немає."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.bookings.map((booking) => (
            <AccountBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href={pageHref(Math.max(1, data.page - 1))}
            className={cn("text-fg-muted hover:text-fg", data.page <= 1 && "pointer-events-none opacity-30")}
          >
            ← Попередня
          </Link>
          <span className="text-fg-subtle">
            {data.page} / {data.totalPages}
          </span>
          <Link
            href={pageHref(Math.min(data.totalPages, data.page + 1))}
            className={cn(
              "text-fg-muted hover:text-fg",
              data.page >= data.totalPages && "pointer-events-none opacity-30",
            )}
          >
            Наступна →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
