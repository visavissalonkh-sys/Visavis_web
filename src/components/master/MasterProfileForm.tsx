"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ButtonAction } from "@/components/ui/button";
import { AvatarUploader } from "@/components/master/AvatarUploader";

type Service = { id: string; category: string; name: string };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function MasterProfileForm({
  initialProfile,
  services,
  initialSpecialtyIds,
}: {
  initialProfile: { slug: string; name: string; bio: string | null; avatarUrl: string | null; instagramUrl: string | null; rating: number };
  services: Service[];
  initialSpecialtyIds: string[];
}) {
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialProfile.instagramUrl ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [specialtyIds, setSpecialtyIds] = useState(new Set(initialSpecialtyIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      map.set(s.category, [...(map.get(s.category) ?? []), s]);
    }
    return map;
  }, [services]);

  function toggleSpecialty(id: string) {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/master/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio: bio.trim() || undefined,
          instagramUrl: instagramUrl.trim() || "",
          avatarUrl: avatarUrl ?? undefined,
          specialtyServiceIds: [...specialtyIds],
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Профіль збережено ✓" : data.message ?? "Не вдалося зберегти профіль.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
        <AvatarUploader name={name} avatarUrl={avatarUrl} onUploaded={setAvatarUrl} />

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm text-fg-muted">
            Ім&apos;я
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-fg outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bio" className="text-sm text-fg-muted">
            Про себе ({bio.length}/500)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            rows={4}
            className="resize-none rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="instagram" className="text-sm text-fg-muted">
            Instagram
          </label>
          <input
            id="instagram"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/..."
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm text-fg-muted">Спеціалізації</span>
          <div className="flex flex-col gap-4">
            {[...servicesByCategory.entries()].map(([category, categoryServices]) => (
              <div key={category} className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.1em] text-fg-subtle">{category}</span>
                <div className="flex flex-wrap gap-2">
                  {categoryServices.map((service) => {
                    const active = specialtyIds.has(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleSpecialty(service.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border-strong text-fg-muted hover:text-fg"
                        }`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ButtonAction onClick={save} disabled={saving}>
            {saving ? "Зберігаємо…" : "Зберегти профіль"}
          </ButtonAction>
          {message ? <span className="text-sm text-fg-muted">{message}</span> : null}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">
          Так виглядає на /masters/{initialProfile.slug}
        </span>
        <div className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-7">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={name} fill sizes="64px" className="object-cover" />
            ) : (
              <span className="font-display text-lg text-accent">{initials(name)}</span>
            )}
          </div>
          <div>
            <h3 className="font-display text-xl text-fg">{name}</h3>
            {bio ? <p className="mt-1 text-sm text-fg-muted">{bio}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...specialtyIds].map((id) => {
              const service = services.find((s) => s.id === id);
              return service ? (
                <span key={id} className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                  {service.name}
                </span>
              ) : null;
            })}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-fg">★ {initialProfile.rating.toFixed(1)}</span>
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover">
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
