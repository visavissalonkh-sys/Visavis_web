"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminReviewCard } from "@/lib/admin";
import { ButtonAction } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

function ReviewCard({
  review,
  busy,
  onPublish,
  onReject,
  onUnpublish,
}: {
  review: AdminReviewCard;
  busy: boolean;
  onPublish: () => void;
  onReject: (reason?: string) => void;
  onUnpublish: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-fg">{review.clientName}</p>
          <p className="text-sm text-fg-muted">
            {review.masterName ? `до ${review.masterName}` : "без прив'язки до майстра"} · {review.locationName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-accent">{stars(review.rating)}</span>
          <span className="text-xs text-fg-subtle">{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {review.text && <p className="text-sm text-fg">{review.text}</p>}

      {review.rejectionReason && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Причина відхилення: {review.rejectionReason}
        </p>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Причина відхилення (необов'язково)"
            disabled={busy}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-3">
            <ButtonAction
              variant="outline"
              className="hover:border-red-400 hover:text-red-400"
              disabled={busy}
              onClick={() => onReject(reason.trim() || undefined)}
            >
              Підтвердити відхилення
            </ButtonAction>
            <ButtonAction variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              Скасувати
            </ButtonAction>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {review.isPublished ? (
            <ButtonAction
              variant="outline"
              className="hover:border-red-400 hover:text-red-400"
              disabled={busy}
              onClick={onUnpublish}
            >
              Зняти з публікації
            </ButtonAction>
          ) : (
            <>
              <ButtonAction disabled={busy} onClick={onPublish}>
                Опублікувати
              </ButtonAction>
              <ButtonAction
                variant="outline"
                className="hover:border-red-400 hover:text-red-400"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                Відхилити
              </ButtonAction>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminReviewsPanel({
  initialQueue,
  initialPublished,
}: {
  initialQueue: AdminReviewCard[];
  initialPublished: AdminReviewCard[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"queue" | "published">("queue");
  const [queue, setQueue] = useState(initialQueue);
  const [published, setPublished] = useState(initialPublished);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, url: string, body?: object) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося виконати дію.");
        return;
      }
      const refreshed = await fetch("/api/admin/reviews").then((r) => r.json());
      setQueue(refreshed.queue);
      setPublished(refreshed.published);
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setBusyId(null);
    }
  }

  const items = tab === "queue" ? queue : published;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm transition-colors",
            tab === "queue"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border-strong text-fg-muted hover:text-fg",
          )}
        >
          На модерації {queue.length > 0 && `(${queue.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab("published")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm transition-colors",
            tab === "published"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border-strong text-fg-muted hover:text-fg",
          )}
        >
          Опубліковані ({published.length})
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
          {tab === "queue" ? "Черга модерації порожня." : "Опублікованих відгуків ще немає."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={busyId === review.id}
              onPublish={() => act(review.id, `/api/admin/reviews/${review.id}/publish`)}
              onReject={(reason) => act(review.id, `/api/admin/reviews/${review.id}/reject`, { reason })}
              onUnpublish={() => act(review.id, `/api/admin/reviews/${review.id}/unpublish`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
