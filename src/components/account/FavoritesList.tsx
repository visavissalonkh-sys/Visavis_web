"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FavoritesList as FavoritesListData } from "@/lib/account";
import { ButtonAction, Button } from "@/components/ui/button";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function FavoritesList({ initialFavorites }: { initialFavorites: FavoritesListData }) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(masterId: string) {
    setRemovingId(masterId);
    try {
      await fetch(`/api/account/favorites/${masterId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.masterId !== masterId));
    } finally {
      setRemovingId(null);
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-fg-muted">
        Додайте майстрів до обраних на їхніх сторінках.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {favorites.map((f) => (
        <div
          key={f.masterId}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link href={`/masters`} className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
              {f.avatarUrl ? (
                <Image src={f.avatarUrl} alt={f.name} fill sizes="56px" className="object-cover" />
              ) : (
                <span className="font-display text-accent">{initials(f.name)}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-fg">{f.name}</span>
              <span className="text-sm text-fg-muted">{f.specialtyNames.join(", ") || "—"}</span>
              <span className="text-xs text-fg-subtle">★ {f.rating.toFixed(1)}</span>
            </div>
          </Link>

          <div className="flex flex-wrap gap-2">
            <Button href={`/booking?masterId=${f.masterId}`} variant="outline" size="md">
              Записатися
            </Button>
            <ButtonAction
              variant="ghost"
              className="hover:text-red-400"
              onClick={() => remove(f.masterId)}
              disabled={removingId === f.masterId}
            >
              {removingId === f.masterId ? "Видаляємо…" : "Видалити з обраних"}
            </ButtonAction>
          </div>
        </div>
      ))}
    </div>
  );
}
