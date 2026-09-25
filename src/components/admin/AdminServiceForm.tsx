"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/data/services";
import { PhotosUploader } from "@/components/admin/PhotosUploader";
import { ButtonAction } from "@/components/ui/button";

export function AdminServiceForm({
  mode,
  serviceId,
  initial,
}: {
  mode: "create" | "edit";
  serviceId?: string;
  initial?: {
    category: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceFrom: number;
    priceTo: number | null;
    photoUrls: string[];
    seoSlug: string;
  };
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initial?.category ?? categories[0].slug);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState(String(initial?.durationMinutes ?? 60));
  const [priceFrom, setPriceFrom] = useState(String(initial?.priceFrom ?? ""));
  const [priceTo, setPriceTo] = useState(initial?.priceTo != null ? String(initial.priceTo) : "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photoUrls ?? []);
  const [seoSlug, setSeoSlug] = useState(initial?.seoSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSeoSlug(value);
  }

  async function save() {
    setError(null);
    const parsedFrom = Number(priceFrom);
    const parsedTo = priceTo.trim() ? Number(priceTo) : undefined;
    if (!name.trim() || !description.trim() || Number.isNaN(parsedFrom)) {
      setError("Заповніть назву, опис і ціну «від».");
      return;
    }

    setSaving(true);
    try {
      const body = {
        category,
        name: name.trim(),
        description: description.trim(),
        durationMinutes: Number(durationMinutes),
        priceFrom: parsedFrom,
        priceTo: parsedTo,
        photoUrls,
        seoSlug: seoSlug.trim() || undefined,
      };
      const url = mode === "create" ? "/api/admin/services" : `/api/admin/services/${serviceId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти послугу.");
        return;
      }
      router.push("/admin/services");
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Категорія</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Тривалість (хв)</label>
          <input
            type="number"
            min={5}
            max={600}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Назва</label>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={150}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">SEO slug</label>
        <input
          value={seoSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSeoSlug(e.target.value);
          }}
          maxLength={100}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
        <span className="text-xs text-fg-subtle">Автогенерується з назви, поки ви його не зміните вручну.</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Ціна від (₴)</label>
          <input
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Ціна до (₴, необов&apos;язково)</label>
          <input
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Опис</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Фото</label>
        <PhotosUploader photoUrls={photoUrls} onChange={setPhotoUrls} purpose="service" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ButtonAction onClick={save} disabled={saving} className="w-fit">
        {saving ? "Зберігаємо…" : mode === "create" ? "Створити послугу" : "Зберегти зміни"}
      </ButtonAction>
    </div>
  );
}
