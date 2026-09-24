"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS } from "@/components/master/status-badge";
import type { BookingStatus } from "@prisma/client";
import { ButtonAction } from "@/components/ui/button";

const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

export function AdminBookingsFilters({
  initial,
  locations,
  masters,
}: {
  initial: {
    dateFrom?: string;
    dateTo?: string;
    masterId?: string;
    locationId?: string;
    statuses: BookingStatus[];
    search?: string;
  };
  locations: { id: string; name: string }[];
  masters: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState(initial.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initial.dateTo ?? "");
  const [masterId, setMasterId] = useState(initial.masterId ?? "");
  const [locationId, setLocationId] = useState(initial.locationId ?? "");
  const [statuses, setStatuses] = useState<Set<BookingStatus>>(new Set(initial.statuses));
  const [search, setSearch] = useState(initial.search ?? "");

  function toggleStatus(status: BookingStatus) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function apply() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (masterId) params.set("masterId", masterId);
    if (locationId) params.set("locationId", locationId);
    if (statuses.size > 0) params.set("status", [...statuses].join(","));
    if (search.trim()) params.set("search", search.trim());
    router.push(`/admin/bookings?${params.toString()}`);
  }

  function reset() {
    setDateFrom("");
    setDateTo("");
    setMasterId("");
    setLocationId("");
    setStatuses(new Set());
    setSearch("");
    router.push("/admin/bookings");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">Від</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">До</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">Майстер</label>
          <select
            value={masterId}
            onChange={(e) => setMasterId(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          >
            <option value="">Усі майстри</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">Філія</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          >
            <option value="">Усі філії</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-fg-subtle">Пошук клієнта</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ім'я або телефон"
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-fg-subtle">Статус:</span>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={
              statuses.has(s)
                ? "rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs text-accent"
                : "rounded-full border border-border-strong px-3 py-1 text-xs text-fg-muted hover:text-fg"
            }
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <ButtonAction onClick={apply} size="md">
          Застосувати
        </ButtonAction>
        <ButtonAction variant="ghost" onClick={reset} size="md">
          Скинути
        </ButtonAction>
      </div>
    </div>
  );
}
