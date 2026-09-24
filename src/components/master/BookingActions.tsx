"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonAction } from "@/components/ui/button";

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "confirm" | "reject" | "complete", body?: Record<string, unknown>) {
    setLoading(action);
    try {
      await fetch(`/api/master/bookings/${bookingId}/${action}`, {
        method: "PATCH",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      router.refresh();
      setShowReasonInput(false);
      setReason("");
    } finally {
      setLoading(null);
    }
  }

  if (status !== "pending" && status !== "confirmed") {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {status === "pending" && (
          <ButtonAction onClick={() => act("confirm")} disabled={loading !== null}>
            {loading === "confirm" ? "…" : "Підтвердити"}
          </ButtonAction>
        )}
        {status === "confirmed" && (
          <ButtonAction onClick={() => act("complete")} disabled={loading !== null}>
            {loading === "complete" ? "…" : "Завершено"}
          </ButtonAction>
        )}
        <ButtonAction
          variant="outline"
          onClick={() => setShowReasonInput((v) => !v)}
          disabled={loading !== null}
        >
          {status === "pending" ? "Відхилити" : "Скасувати"}
        </ButtonAction>
      </div>

      {showReasonInput && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-4">
          <label htmlFor="reject-reason" className="text-xs text-fg-subtle">
            Причина (необов&apos;язково, для вас/адміністрації)
          </label>
          <input
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Захворів / помилка в розкладі…"
            className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <ButtonAction
            variant="outline"
            onClick={() => act("reject", { reason: reason.trim() || undefined })}
            disabled={loading !== null}
            className="w-fit border-red-500/40 text-red-400 hover:border-red-400"
          >
            {loading === "reject" ? "…" : "Підтвердити скасування"}
          </ButtonAction>
        </div>
      )}
    </div>
  );
}
