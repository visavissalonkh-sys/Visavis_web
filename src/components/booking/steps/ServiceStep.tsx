"use client";

import { useEffect, useMemo, useState } from "react";
import type { ServiceCategory } from "@/lib/data/services";
import type { WizardService } from "@/components/booking/types";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function ServiceStep({
  categories,
  services,
  initialCategory,
  onSelect,
}: {
  categories: ServiceCategory[];
  services: WizardService[];
  initialCategory?: string | null;
  onSelect: (service: WizardService) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    initialCategory ?? categories[0]?.slug ?? null,
  );

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    return services.filter((s) => s.name.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, services]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-fg sm:text-3xl">Оберіть послугу</h2>
        <p className="mt-1 text-sm text-fg-muted">Почніть з категорії або скористайтеся пошуком.</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Пошук послуги…"
        className="sticky z-10 w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-base text-fg outline-none transition-colors focus:border-accent"
        style={{ top: "calc(var(--header-h) + 12px)" }}
      />

      {searchResults ? (
        <div className="flex flex-col gap-3">
          {searchResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">Нічого не знайдено за запитом «{debouncedQuery}»</p>
          ) : (
            searchResults.map((service) => (
              <ServiceRow key={service.id} service={service} onSelect={onSelect} />
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((category) => {
            const categoryServices = services.filter((s) => s.category === category.slug);
            const isOpen = expandedCategory === category.slug;

            return (
              <div key={category.slug} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isOpen ? null : category.slug)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <h3 className="font-display text-lg text-fg">{category.name}</h3>
                    <p className="text-xs text-fg-subtle">{category.tagline}</p>
                  </div>
                  <span className={`text-fg-subtle transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </button>

                {isOpen ? (
                  <div className="flex flex-col gap-3 border-t border-border p-5 pt-4">
                    {categoryServices.map((service) => (
                      <ServiceRow key={service.id} service={service} onSelect={onSelect} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceRow({ service, onSelect }: { service: WizardService; onSelect: (s: WizardService) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 p-4 text-left transition-colors hover:border-accent-border"
    >
      <div className="flex flex-col">
        <span className="text-fg">{service.name}</span>
        <span className="text-xs text-fg-subtle">{service.durationMinutes} хв</span>
      </div>
      <span className="whitespace-nowrap text-sm text-accent">
        від {service.priceFrom} ₴{service.priceTo ? ` до ${service.priceTo} ₴` : ""}
      </span>
    </button>
  );
}
