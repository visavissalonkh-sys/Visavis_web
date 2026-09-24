"use client";

import { useState } from "react";
import { ButtonAction } from "@/components/ui/button";

export function FavoriteToggleButton({
  masterId,
  initialFavorited,
}: {
  masterId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (favorited) {
        const res = await fetch(`/api/account/favorites/${masterId}`, { method: "DELETE" });
        if (res.ok) setFavorited(false);
      } else {
        const res = await fetch("/api/account/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterId }),
        });
        if (res.ok) setFavorited(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ButtonAction variant="outline" onClick={toggle} disabled={loading}>
      {favorited ? "★ В обраному" : "☆ Додати в обрані"}
    </ButtonAction>
  );
}
