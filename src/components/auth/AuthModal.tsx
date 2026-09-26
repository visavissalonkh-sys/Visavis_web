"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneInput, isCompletePhoneDigits } from "@/components/auth/PhoneInput";
import { OTPInput } from "@/components/auth/OTPInput";
import { ButtonAction } from "@/components/ui/button";

const SWIPE_DISMISS_THRESHOLD_PX = 120;

export type SessionUser = {
  id: string;
  name: string | null;
  phone: string;
  role: "client" | "master" | "admin";
};

type Step = "phone" | "otp" | "success";

const RESEND_COOLDOWN_SECONDS = 300;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "salon_visavis_bot";

function normalizeForSubmit(digits: string): string {
  return `+38${digits}`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AuthModal({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (user: SessionUser) => void;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramNotLinked, setTelegramNotLinked] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Swipe-to-dismiss (mobile only, via touch-action: none below) — tracks
  // the drag directly on the DOM node instead of React state, since this
  // needs to move every touchmove frame and only transform/opacity are
  // cheap enough to animate at that rate.
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  function handleCardTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }

  function handleCardTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null || !cardRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta <= 0) return; // only downward drags dismiss
    cardRef.current.style.transform = `translateY(${delta}px)`;
    cardRef.current.style.opacity = String(Math.max(0.4, 1 - delta / 400));
  }

  function handleCardTouchEnd(e: React.TouchEvent) {
    if (dragStartY.current === null || !cardRef.current) return;
    const delta = e.changedTouches[0].clientY - dragStartY.current;
    dragStartY.current = null;
    if (delta > SWIPE_DISMISS_THRESHOLD_PX) {
      onClose();
      return;
    }
    cardRef.current.style.transition = "transform 0.25s ease-out, opacity 0.25s ease-out";
    cardRef.current.style.transform = "translateY(0)";
    cardRef.current.style.opacity = "1";
    setTimeout(() => {
      if (cardRef.current) cardRef.current.style.transition = "";
    }, 250);
  }

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const phone = normalizeForSubmit(phoneDigits);

  async function sendOtp() {
    // Explicit re-entrancy guard — otherwise a second call while one is
    // already in flight (e.g. a fast double-click, or OTPInput's paste
    // handler racing a keyboard completion) would fire a second request
    // instead of being a no-op. Disabling the inputs while loading covers
    // keyboard entry, but not every path that can call this.
    if (loading) return;
    setLoading(true);
    setError(null);
    setTelegramNotLinked(false);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "telegram_not_linked") {
          setTelegramNotLinked(true);
        } else {
          setError(data.message ?? "Щось пішло не так. Спробуйте ще раз.");
        }
        return;
      }

      setStep("otp");
      setCountdown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Немає з'єднання. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code: string) {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Невірний код.");
        setOtp("");
        return;
      }

      setStep("success");
      setTimeout(() => onAuthenticated(data.user), 900);
    } catch {
      setError("Немає з'єднання. Перевірте інтернет і спробуйте ще раз.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        ref={cardRef}
        onTouchStart={handleCardTouchStart}
        onTouchMove={handleCardTouchMove}
        onTouchEnd={handleCardTouchEnd}
        className="animate-fade-up relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl"
        style={{ touchAction: "pan-y" }}
      >
        <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-border-strong sm:hidden" aria-hidden />

        {step !== "success" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="absolute right-5 top-5 text-fg-subtle transition-colors hover:text-fg"
          >
            ✕
          </button>
        )}

        {step === "phone" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display text-2xl text-fg">Вхід / Реєстрація</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Введіть номер телефону — ми надішлемо код підтвердження у Telegram.
              </p>
            </div>

            <PhoneInput digits={phoneDigits} onChange={setPhoneDigits} disabled={loading} autoFocus />

            {telegramNotLinked && (
              <div className="flex flex-col gap-3 rounded-2xl border border-accent-border bg-accent-soft p-4 text-sm text-fg">
                <span>Спочатку напишіть /start нашому боту в Telegram — так ми зможемо надіслати код.</span>
                <a
                  href={`https://t.me/${BOT_USERNAME}?start=link`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  Написати боту
                </a>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <ButtonAction
              onClick={sendOtp}
              disabled={!isCompletePhoneDigits(phoneDigits) || loading}
            >
              {loading ? "Надсилаємо…" : "Отримати код"}
            </ButtonAction>
          </div>
        )}

        {step === "otp" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display text-2xl text-fg">Введіть код</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Ми надіслали 6-значний код у Telegram на номер +38{" "}
                {phoneDigits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "($1) $2-$3-$4")}
              </p>
            </div>

            <OTPInput value={otp} onChange={setOtp} onComplete={verifyOtp} disabled={loading} error={!!error} />

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <div className="flex flex-col items-center gap-2 text-sm text-fg-muted">
              {countdown > 0 ? (
                <span>Надіслати повторно через {formatCountdown(countdown)}</span>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
                >
                  Надіслати код повторно
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="text-fg-subtle hover:text-fg"
              >
                Змінити номер телефону
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-3xl text-accent">
              ✓
            </div>
            <h2 className="font-display text-2xl text-fg">Готово!</h2>
            <p className="text-sm text-fg-muted">Ви успішно увійшли до Visavis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
