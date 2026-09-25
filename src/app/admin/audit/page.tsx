import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAuditLog, getAdminAuditFilterOptions } from "@/lib/admin";
import { AdminAuditFilters } from "@/components/admin/AdminAuditFilters";
import { AdminAuditTable } from "@/components/admin/AdminAuditTable";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Аудит",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const actorId = sp.actorId;
  const action = sp.action;
  const dateFrom = sp.dateFrom;
  const dateTo = sp.dateTo;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const [list, filterOptions] = await Promise.all([
    getAdminAuditLog({ actorId, action, dateFrom, dateTo, page }),
    getAdminAuditFilterOptions(),
  ]);

  const currentQuery = new URLSearchParams();
  if (actorId) currentQuery.set("actorId", actorId);
  if (action) currentQuery.set("action", action);
  if (dateFrom) currentQuery.set("dateFrom", dateFrom);
  if (dateTo) currentQuery.set("dateTo", dateTo);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(currentQuery);
    params.set("page", String(nextPage));
    return `/admin/audit?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Аудит</h1>
        <p className="mt-1 text-sm text-fg-muted">Усього записів: {list.total} · лише перегляд, без можливості видалення</p>
      </div>

      <AdminAuditFilters
        initial={{ actorId, action, dateFrom, dateTo }}
        actors={filterOptions.actors}
        actions={filterOptions.actions}
      />

      <AdminAuditTable entries={list.entries} />

      {list.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href={pageHref(Math.max(1, list.page - 1))}
            className={cn("text-fg-muted hover:text-fg", list.page <= 1 && "pointer-events-none opacity-30")}
          >
            ← Попередня
          </Link>
          <span className="text-fg-subtle">
            {list.page} / {list.totalPages}
          </span>
          <Link
            href={pageHref(Math.min(list.totalPages, list.page + 1))}
            className={cn("text-fg-muted hover:text-fg", list.page >= list.totalPages && "pointer-events-none opacity-30")}
          >
            Наступна →
          </Link>
        </div>
      )}
    </div>
  );
}
