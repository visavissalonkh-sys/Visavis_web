"use client";

import { useState } from "react";
import { PhoneInput, isCompletePhoneDigits } from "@/components/auth/PhoneInput";
import { ButtonAction } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { normalizePhone } from "@/lib/phone";

const NAME_MIN = 2;
const NAME_MAX = 100;
const COMMENT_MAX = 500;

export function GuestBookingForm({
  serviceId,
  masterId,
  locationId,
  date,
  timeFrom,
  lockToken,
  onSuccess,
}: {
  serviceId: string;
  masterId: string;
  locationId: string;
  date: string;
  timeFrom: string;
  lockToken: string;
  onSuccess: (bookingId: string) => void;
}) {
  const { openAuthModal } = useAuthModal();
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [comment, setComment] = useState("");
  // Honeypot — never rendered visibly; a human never fills it, a bot's
  // autofill often does. Kept out of the tab order and hidden from screen
  // readers so it can't be reached by anyone actually using the form.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  function validate(): boolean {
    let ok = true;
    const trimmedName = name.trim();
    if (trimmedName.length < NAME_MIN || trimmedName.length > NAME_MAX) {
      setNameError(`Ім'я має містити від ${NAME_MIN} до ${NAME_MAX} символів`);
      ok = false;
    } else {
      setNameError(null);
    }

    if (!isCompletePhoneDigits(phoneDigits) || !normalizePhone(`+38${phoneDigits}`)) {
      setPhoneError("Введіть коректний номер телефону");
      ok = false;
    } else {
      setPhoneError(null);
    }

    return ok;
  }

  async function submit() {
    setError(null);
    if (!validate()) return;

    const guestPhone = normalizePhone(`+38${phoneDigits}`);
    if (!guestPhone) return; // unreachable — validate() already confirmed this

    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          masterId,
          locationId,
          date,
          timeFrom,
          lockToken,
          guestName: name.trim(),
          guestPhone,
          comment: comment.trim() || undefined,
          website,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Не вдалося створити запис. Спробуйте ще раз.");
        return;
      }

      onSuccess(data.bookingId);
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
      <h3 className="font-display text-lg text-fg">Ваші контактні дані</h3>

      <div className="flex flex-col gap-2">
        <label htmlFor="guest-name" className="text-sm text-fg-muted">
          Ім&apos;я
        </label>
        <input
          id="guest-name"
          type="text"
          autoComplete="name"
          disabled={submitting}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="Введіть ваше ім'я"
          className="h-[52px] w-full rounded-xl border border-border-strong bg-surface px-4 text-base text-fg outline-none transition-colors focus:border-accent disabled:opacity-50"
        />
        {nameError ? <p className="text-sm text-red-400">{nameError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <PhoneInput digits={phoneDigits} onChange={setPhoneDigits} disabled={submitting} />
        {phoneError ? <p className="text-sm text-red-400">{phoneError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="guest-comment" className="text-sm text-fg-muted">
          💬 Коментар до запису (необов&apos;язково)
        </label>
        <textarea
          id="guest-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={COMMENT_MAX}
          rows={3}
          placeholder="Побажання щодо стилю, алергії…"
          className="w-full resize-none rounded-xl border border-border-strong bg-surface px-4 py-3 text-base text-fg outline-none transition-colors focus:border-accent disabled:opacity-50"
          disabled={submitting}
        />
      </div>

      {/* Honeypot field — invisible and unreachable by keyboard/screen reader for a real visitor. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="guest-website">Залиште це поле порожнім</label>
        <input
          id="guest-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {/* Sticky on mobile only — desktop keeps the button inline in the card. */}
      <div className="hidden lg:block">
        <ButtonAction onClick={submit} disabled={submitting} size="lg">
          {submitting ? "Оформлюємо…" : "✅ Підтвердити запис"}
        </ButtonAction>
      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg px-6 pt-4 lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <ButtonAction onClick={submit} disabled={submitting} size="lg" className="w-full">
          {submitting ? "Оформлюємо…" : "✅ Підтвердити запис"}
        </ButtonAction>
      </div>
      {/* Reserves the space the fixed bar above occupies so it never covers
          the content that would otherwise be the last thing on the page. */}
      <div className="h-20 lg:hidden" aria-hidden />

      <div className="flex flex-col items-center gap-2 border-t border-border pt-4 text-center text-sm">
        <span className="text-fg-muted">Вже є акаунт Visavis?</span>
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="font-medium text-accent transition-colors hover:text-accent-hover"
        >
          🔐 Увійти через Telegram
        </button>
      </div>
    </div>
  );
}
