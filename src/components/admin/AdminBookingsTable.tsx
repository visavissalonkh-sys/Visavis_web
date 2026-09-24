"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_CLASSES, STATUS_LABELS } from "@/components/master/status-badge";
import { cn } from "@/lib/utils";
import type { AdminBookingsList, AdminBookingsSortBy } from "@/lib/admin";

const COLUMNS: { key: AdminBookingsSortBy; label: string }[] = [
  { key: "date", label: "Дата/час" },
  { key: "client", label: "Клієнт" },
  { key: "master", label: "Майстер" },
  { key: "service", label: "Послуга" },
  { key: "location", label: "Філія" },
  { key: "status", label: "Статус" },
];

export function AdminBookingsTable({
  bookings,
  currentQuery,
  sortBy,
  sortDir,
}: {
  bookings: AdminBookingsList["bookings"];
  currentQuery: URLSearchParams;
  sortBy: AdminBookingsSortBy;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [rows, setRows] = useState(bookings);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function sortHref(column: AdminBookingsSortBy): string {
    const params = new URLSearchParams(currentQuery);
    const nextDir = sortBy === column && sortDir === "asc" ? "desc" : "asc";
    params.set("sortBy", column);
    params.set("sortDir", nextDir);
    params.delete("page");
    return `/admin/bookings?${params.toString()}`;
  }

  async function cancel(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: "PATCH" });
      if (res.ok) {
        setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled", canCancel: false } : b)));
        router.refresh();
      }
    } finally {
      setCancellingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-fg-muted">
        Немає записів за цим фільтром.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
            {COLUMNS.map((col) => (
              <th key={col.key} className="p-4">
                <Link href={sortHref(col.key)} className="inline-flex items-center gap-1 hover:text-fg">
                  {col.label}
                  {sortBy === col.key && <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>}
                </Link>
              </th>
            ))}
            <th className="p-4">Дії</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-border/60 last:border-0">
              <td className="p-4 text-fg">
                {b.date.split("-").reverse().join(".")} {b.timeFrom}
              </td>
              <td className="p-4 text-fg-muted">
                {b.clientName ?? "Клієнт"} · {b.clientPhone}
              </td>
              <td className="p-4 text-fg-muted">{b.masterName}</td>
              <td className="p-4 text-fg-muted">{b.serviceName}</td>
              <td className="p-4 text-fg-muted">{b.locationName}</td>
              <td className="p-4">
                <span className={cn("rounded-full border px-3 py-1 text-xs", STATUS_CLASSES[b.status])}>
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </td>
              <td className="p-4">
                {b.canCancel && (
                  <button
                    type="button"
                    onClick={() => cancel(b.id)}
                    disabled={cancellingId === b.id}
                    className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                  >
                    {cancellingId === b.id ? "…" : "Скасувати"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
