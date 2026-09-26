"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonAction } from "@/components/ui/button";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "salon_visavis_bot";

export function TelegramLinkStatus({ linked, username }: { linked: boolean; username: string | null }) {
  const [unlinking, setUnlinking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function unlink() {
    setUnlinking(true);
    setError(null);
    try {
      const res = await fetch("/api/account/telegram", { method: "DELETE" });
      if (!res.ok) {
        setError("Не вдалося відв'язати Telegram.");
        return;
      }
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setUnlinking(false);
      setConfirming(false);
    }
  }

  if (linked) {
    return (
      <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-fg">
          <span aria-hidden>🔔</span>
          <span>{username ? `@${username}` : "Telegram"} підключено ✅</span>
        </div>
        <p className="text-sm text-fg-muted">Ви отримуєте нагадування про ваші записи.</p>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {confirming ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-fg-subtle">
              Після відв&apos;язки ви не зможете отримати код входу, поки не напишете боту /start ще раз. Точно
              відв&apos;язати?
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonAction
                variant="outline"
                className="hover:border-red-400 hover:text-red-400"
                onClick={unlink}
                disabled={unlinking}
              >
                {unlinking ? "Відв'язуємо…" : "Так, відв'язати"}
              </ButtonAction>
              <ButtonAction variant="ghost" onClick={() => setConfirming(false)} disabled={unlinking}>
                Скасувати
              </ButtonAction>
            </div>
          </div>
        ) : (
          <ButtonAction variant="outline" className="w-fit" onClick={() => setConfirming(true)}>
            Відв&apos;язати
          </ButtonAction>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-accent-border bg-accent-soft p-6">
      <p className="text-sm text-fg">
        🔔 Підключіть Telegram, щоб входити за кодом та отримувати нагадування про візити за день і за 2 години.
      </p>
      <a
        href={`https://t.me/${BOT_USERNAME}?start=link`}
        target="_blank"
        rel="noreferrer"
        className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        Підключити Telegram
      </a>
    </div>
  );
}
