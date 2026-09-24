"use client";

import { useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { ButtonAction } from "@/components/ui/button";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 12) return phone;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
}

export function AccountProfileForm({
  initialName,
  phone,
  createdAt,
}: {
  initialName: string | null;
  phone: string;
  createdAt: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти зміни.");
        return;
      }
      setMessage("Збережено ✓");
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm text-fg-subtle">
          Ім&apos;я
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-fg-subtle">Телефон</span>
        <span className="text-fg">{maskPhone(phone)}</span>
        <span className="text-xs text-fg-subtle">Логін — редагування недоступне</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-fg-subtle">Дата реєстрації</span>
        <span className="text-fg">{format(new Date(createdAt), "d MMMM yyyy", { locale: uk })}</span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-accent">{message}</p>}

      <ButtonAction onClick={save} disabled={saving || name.trim().length === 0} className="w-fit">
        {saving ? "Зберігаємо…" : "Зберегти"}
      </ButtonAction>
    </div>
  );
}
