"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

type MeResponse = { user: { name: string | null } | null };

export function HeaderAuthAction({ className }: { className?: string }) {
  const { openAuthModal } = useAuthModal();
  const [user, setUser] = useState<MeResponse["user"] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) {
    return <div className={className} aria-hidden />;
  }

  if (user) {
    return (
      <Link href="/account" className={`text-sm text-fg-muted transition-colors hover:text-fg ${className ?? ""}`}>
        {user.name ? user.name.split(" ")[0] : "Кабінет"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAuthModal()}
      className={`text-sm text-fg-muted transition-colors hover:text-fg ${className ?? ""}`}
    >
      Увійти
    </button>
  );
}
