"use client";

import { ButtonAction } from "@/components/ui/button";

export function CancelBookingModal({
  serviceName,
  dateLabel,
  loading,
  onConfirm,
  onClose,
}: {
  serviceName: string;
  dateLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="animate-fade-up relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="absolute right-5 top-5 text-fg-subtle transition-colors hover:text-fg"
          disabled={loading}
        >
          ✕
        </button>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-xl text-fg">Скасувати запис?</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Ви впевнені, що хочете скасувати запис на {serviceName.toLowerCase()}, {dateLabel}?
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonAction
              variant="outline"
              className="hover:border-red-400 hover:text-red-400"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Скасовуємо…" : "Так, скасувати"}
            </ButtonAction>
            <ButtonAction variant="ghost" onClick={onClose} disabled={loading}>
              Ні, залишити
            </ButtonAction>
          </div>
        </div>
      </div>
    </div>
  );
}
