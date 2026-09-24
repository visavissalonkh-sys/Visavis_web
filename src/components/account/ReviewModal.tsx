"use client";

import { useState } from "react";
import { StarRating } from "@/components/account/StarRating";
import { ButtonAction } from "@/components/ui/button";

export function ReviewModal({
  bookingId,
  serviceName,
  masterName,
  onClose,
  onSubmitted,
}: {
  bookingId: string;
  serviceName: string;
  masterName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating === 0) {
      setError("Оберіть оцінку від 1 до 5.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, text: text.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти відгук.");
        return;
      }
      onSubmitted();
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

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-xl text-fg">Залишити відгук</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Оцініть &laquo;{serviceName}&raquo; у майстра {masterName}
            </p>
          </div>

          <StarRating value={rating} onChange={setRating} disabled={submitting} />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Ваш коментар (необов'язково)"
            disabled={submitting}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-accent"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <ButtonAction onClick={submit} disabled={submitting}>
            {submitting ? "Надсилаємо…" : "Надіслати відгук"}
          </ButtonAction>
        </div>
      </div>
    </div>
  );
}
