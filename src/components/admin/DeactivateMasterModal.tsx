"use client";

import { useEffect, useState } from "react";
import { ButtonAction } from "@/components/ui/button";
import { ReauthModal } from "@/components/admin/ReauthModal";

export function DeactivateMasterModal({
  masterId,
  masterName,
  onClose,
  onDeactivated,
}: {
  masterId: string;
  masterName: string;
  onClose: () => void;
  onDeactivated: () => void;
}) {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [cancelAll, setCancelAll] = useState(true);
  const [step, setStep] = useState<"choice" | "reauth">("choice");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/masters/${masterId}/deactivate`)
      .then((r) => r.json())
      .then((data) => setActiveCount(data.activeBookingsCount ?? 0))
      .catch(() => setActiveCount(0));
  }, [masterId]);

  async function confirmDeactivate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/masters/${masterId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelActiveBookings: cancelAll }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося деактивувати майстра.");
        return;
      }
      onDeactivated();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "reauth") {
    return (
      <ReauthModal
        title="Підтвердіть деактивацію"
        description={`Деактивація майстра ${masterName} — критична дія, потрібне підтвердження кодом.`}
        onVerified={confirmDeactivate}
        onClose={() => setStep("choice")}
      />
    );
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

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-xl text-fg">Деактивувати {masterName}?</h2>
            {activeCount === null ? (
              <p className="mt-2 text-sm text-fg-muted">Перевіряємо активні записи…</p>
            ) : activeCount > 0 ? (
              <p className="mt-2 text-sm text-fg-muted">
                У майстра є <b className="text-fg">{activeCount}</b> активних записів. Скасувати їх чи залишити?
              </p>
            ) : (
              <p className="mt-2 text-sm text-fg-muted">Активних записів немає.</p>
            )}
          </div>

          {activeCount !== null && activeCount > 0 && (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="radio" checked={cancelAll} onChange={() => setCancelAll(true)} />
                Скасувати всі — клієнти отримають сповіщення
              </label>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="radio" checked={!cancelAll} onChange={() => setCancelAll(false)} />
                Залишити — майстер деактивований, записи лишаються
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <ButtonAction
              variant="outline"
              className="hover:border-red-400 hover:text-red-400"
              onClick={() => setStep("reauth")}
              disabled={activeCount === null}
            >
              Продовжити
            </ButtonAction>
            <ButtonAction variant="ghost" onClick={onClose}>
              Скасувати
            </ButtonAction>
          </div>
        </div>
      </div>
    </div>
  );
}
