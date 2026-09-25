"use client";

import { useState } from "react";
import { STATUS_LABELS } from "@/components/master/status-badge";
import { ButtonAction } from "@/components/ui/button";

const MAX_RANGE_DAYS = 365;

function daysBetween(fromStr: string, toStr: string) {
  return Math.round((new Date(`${toStr}T00:00:00Z`).getTime() - new Date(`${fromStr}T00:00:00Z`).getTime()) / 86400000);
}

export function AdminReportExportModal({
  initialFrom,
  initialTo,
  masters,
  locations,
  statuses,
  onClose,
}: {
  initialFrom: string;
  initialTo: string;
  masters: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  statuses: string[];
  onClose: () => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [masterId, setMasterId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (from > to) {
      setError("«Від» не може бути пізніше за «до».");
      return;
    }
    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      setError("Максимальний період — 365 днів.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          masterId: masterId || undefined,
          locationId: locationId || undefined,
          status: status || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Не вдалося сформувати звіт.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `visavis-zvit-${from}_${to}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      onClose();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="animate-fade-up relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="absolute right-5 top-5 text-fg-subtle transition-colors hover:text-fg"
          disabled={submitting}
        >
          ✕
        </button>

        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-display text-xl text-fg">Завантажити звіт</h2>
            <p className="mt-2 text-sm text-fg-muted">Оберіть період та фільтри для xlsx-звіту по записах.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-fg-subtle">Від</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                disabled={submitting}
                className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-fg-subtle">До</label>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                disabled={submitting}
                className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-subtle">Майстер</label>
            <select
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              disabled={submitting}
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
              disabled={submitting}
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

          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-subtle">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={submitting}
              className="rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg"
            >
              <option value="">Усі статуси</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <ButtonAction onClick={submit} disabled={submitting}>
            {submitting ? "Формуємо…" : "Завантажити"}
          </ButtonAction>
        </div>
      </div>
    </div>
  );
}
