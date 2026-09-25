"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonAction } from "@/components/ui/button";

export function AdminAuditFilters({
  initial,
  actors,
  actions,
}: {
  initial: { actorId?: string; action?: string; dateFrom?: string; dateTo?: string };
  actors: { id: string; name: string }[];
  actions: string[];
}) {
  const router = useRouter();
  const [actorId, setActorId] = useState(initial.actorId ?? "");
  const [action, setAction] = useState(initial.action ?? "");
  const [dateFrom, setDateFrom] = useState(initial.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initial.dateTo ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (actorId) params.set("actorId", actorId);
    if (action) params.set("action", action);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    router.push(`/admin/audit?${params.toString()}`);
  }

  function reset() {
    setActorId("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    router.push("/admin/audit");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">Адмін</label>
          <select
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          >
            <option value="">Усі</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-subtle">Тип дії</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
          >
            <option value="">Усі</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

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
