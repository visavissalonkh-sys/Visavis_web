"use client";

import type { WizardMaster, WizardService } from "@/components/booking/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function MasterStep({
  service,
  masters,
  onSelect,
  onBack,
}: {
  service: WizardService;
  masters: WizardMaster[];
  onSelect: (master: WizardMaster) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-fg-muted hover:text-fg">
          ← Змінити послугу
        </button>
        <h2 className="mt-3 font-display text-2xl text-fg sm:text-3xl">Оберіть майстра</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Послуга: <span className="text-fg">{service.name}</span>
        </p>
      </div>

      {masters.length > 1 ? (
        <button
          type="button"
          onClick={() => onSelect(masters[0])}
          className="rounded-2xl border border-dashed border-border-strong p-5 text-left text-sm text-fg-muted transition-colors hover:border-accent-border hover:text-fg"
        >
          Будь-який майстер — система обере першого доступного
        </button>
      ) : null}

      {/* Desktop/tablet: card grid */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2">
        {masters.map((master) => (
          <button
            key={master.id}
            type="button"
            onClick={() => onSelect(master)}
            className="relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 text-left transition-colors hover:border-accent-border hover:bg-surface-2"
          >
            {master.isPopular ? (
              <span className="absolute right-4 top-4 rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent">
                Найпопулярніший
              </span>
            ) : null}

            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-accent">
              {initials(master.name)}
            </div>

            <div>
              <h3 className="font-display text-lg text-fg">{master.name}</h3>
              {master.bio ? <p className="mt-1 text-sm text-fg-muted line-clamp-2">{master.bio}</p> : null}
            </div>

            <div className="mt-auto text-sm text-fg">★ {master.rating.toFixed(1)}</div>
          </button>
        ))}
      </div>

      {/* Mobile: vertical list — avatar left, name/specialty/rating middle, "Обрати" right */}
      <div className="flex flex-col gap-3 sm:hidden">
        {masters.map((master) => (
          <div
            key={master.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-accent">
              {initials(master.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-lg text-fg">{master.name}</h3>
              {master.isPopular ? (
                <span className="text-xs text-accent">Найпопулярніший</span>
              ) : master.bio ? (
                <p className="truncate text-xs text-fg-muted">{master.bio}</p>
              ) : null}
              <div className="text-sm text-fg">★ {master.rating.toFixed(1)}</div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(master)}
              className="flex h-11 shrink-0 items-center justify-center rounded-full border border-accent-border px-4 text-sm text-accent transition-colors hover:bg-accent-soft"
            >
              Обрати
            </button>
          </div>
        ))}
      </div>

      {masters.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-subtle">
          Наразі немає доступних майстрів для цієї послуги. Зверніться до нас телефоном.
        </p>
      ) : null}
    </div>
  );
}
