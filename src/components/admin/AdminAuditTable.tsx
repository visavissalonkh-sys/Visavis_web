"use client";

import { useState } from "react";
import type { AdminAuditList } from "@/lib/admin";

type AuditEntry = AdminAuditList["entries"][number];

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" });
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ValueDiff({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const oldObj = oldValue && typeof oldValue === "object" ? (oldValue as Record<string, unknown>) : null;
  const newObj = newValue && typeof newValue === "object" ? (newValue as Record<string, unknown>) : null;

  if (!oldObj && !newObj) return null;

  const keys = Array.from(new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]));

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border-strong bg-surface-2 p-3 font-mono text-xs">
      {keys.map((key) => {
        const before = oldObj?.[key];
        const after = newObj?.[key];
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        return (
          <div key={key} className="flex flex-wrap gap-2">
            <span className="text-fg-subtle">{key}:</span>
            {changed ? (
              <>
                <span className="text-red-400 line-through">{fmt(before)}</span>
                <span className="text-fg-subtle">→</span>
                <span className="text-green-400">{fmt(after)}</span>
              </>
            ) : (
              <span className="text-fg-muted">{fmt(before)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.oldValue !== null || entry.newValue !== null || entry.metadata !== null || entry.ip !== null;

  return (
    <>
      <tr className="border-b border-border">
        <td className="whitespace-nowrap px-3 py-3 text-xs text-fg-subtle">{formatDateTime(entry.createdAt)}</td>
        <td className="px-3 py-3 text-fg">{entry.actorName}</td>
        <td className="px-3 py-3 font-mono text-xs text-accent">{entry.action}</td>
        <td className="px-3 py-3 text-xs text-fg-muted">
          {entry.entityType}
          <span className="text-fg-subtle"> · {entry.entityId.slice(0, 8)}…</span>
        </td>
        <td className="px-3 py-3 text-right">
          {hasDetails ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-fg-muted underline-offset-2 hover:text-accent hover:underline"
            >
              {expanded ? "Згорнути" : "Деталі"}
            </button>
          ) : (
            <span className="text-xs text-fg-subtle">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-surface-2/50">
          <td colSpan={5} className="px-3 py-4">
            <div className="flex flex-col gap-3">
              {(entry.oldValue !== null || entry.newValue !== null) && (
                <ValueDiff oldValue={entry.oldValue} newValue={entry.newValue} />
              )}
              {entry.metadata !== null && (
                <div className="rounded-xl border border-border-strong bg-surface-2 p-3 font-mono text-xs text-fg-muted">
                  {JSON.stringify(entry.metadata)}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-fg-subtle">
                {entry.ip && <span>IP: {entry.ip}</span>}
                {entry.userAgent && <span className="truncate">UA: {entry.userAgent}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminAuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
        Записів не знайдено.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-fg-subtle">
            <th className="px-3 py-3 font-normal">Дата й час</th>
            <th className="px-3 py-3 font-normal">Адмін</th>
            <th className="px-3 py-3 font-normal">Дія</th>
            <th className="px-3 py-3 font-normal">Сутність</th>
            <th className="px-3 py-3 font-normal text-right">Деталі</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
