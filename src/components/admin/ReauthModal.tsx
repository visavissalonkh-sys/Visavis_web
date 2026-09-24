"use client";

import { useState } from "react";
import { ButtonAction } from "@/components/ui/button";

/** Step-up OTP confirmation for a critical admin action — sends a code to
 * the ADMIN'S OWN Telegram (not the target of the action) and calls
 * onVerified() once it checks out. Generic on purpose: master deactivation
 * uses it now, role change (a later block) will reuse it as-is. */
export function ReauthModal({
  title,
  description,
  onVerified,
  onClose,
}: {
  title: string;
  description: string;
  onVerified: () => void;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reauth/send-otp", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося надіслати код.");
        return;
      }
      setSent(true);
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (code.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reauth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Невірний код.");
        setCode("");
        return;
      }
      onVerified();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="animate-fade-up relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="absolute right-5 top-5 text-fg-subtle transition-colors hover:text-fg"
        >
          ✕
        </button>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-xl text-fg">{title}</h2>
            <p className="mt-2 text-sm text-fg-muted">{description}</p>
          </div>

          {!sent ? (
            <ButtonAction onClick={sendOtp} disabled={sending}>
              {sending ? "Надсилаємо…" : "Надіслати код у Telegram"}
            </ButtonAction>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-sm text-fg-subtle">Код з Telegram</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-center text-lg tracking-[0.3em] text-fg outline-none focus:border-accent"
                placeholder="······"
                autoFocus
              />
              <ButtonAction onClick={verify} disabled={verifying || code.length !== 6}>
                {verifying ? "Перевіряємо…" : "Підтвердити"}
              </ButtonAction>
              <button type="button" onClick={sendOtp} disabled={sending} className="text-xs text-fg-subtle hover:text-fg">
                Надіслати код повторно
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
