"use client";

import { useMemo, useState } from "react";
import type { WizardLocation, WizardMaster, WizardMasterLocation, WizardService } from "@/components/booking/types";
import { SlotPicker } from "@/components/booking/SlotPicker";

export function DateTimeStep({
  service,
  master,
  locations,
  masterLocations,
  onLocked,
  onBack,
}: {
  service: WizardService;
  master: WizardMaster;
  locations: WizardLocation[];
  masterLocations: WizardMasterLocation[];
  onLocked: (info: { locationId: string; date: string; time: string; lockToken: string; expiresAt: number }) => void;
  onBack: () => void;
}) {
  const masterLocationIds = useMemo(
    () => Array.from(new Set(masterLocations.filter((ml) => ml.masterId === master.id).map((ml) => ml.locationId))),
    [masterLocations, master.id],
  );
  const availableLocations = locations.filter((l) => masterLocationIds.includes(l.id));

  const [locationId, setLocationId] = useState<string | null>(
    availableLocations.length === 1 ? availableLocations[0].id : null,
  );

  const workingWeekdays = useMemo(() => {
    if (!locationId) return new Set<number>();
    return new Set(
      masterLocations.filter((ml) => ml.masterId === master.id && ml.locationId === locationId).map((ml) => ml.weekday),
    );
  }, [masterLocations, master.id, locationId]);

  const selectedLocation = availableLocations.find((l) => l.id === locationId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-fg-muted hover:text-fg">
          ← Змінити майстра
        </button>
        <h2 className="mt-3 font-display text-2xl text-fg sm:text-3xl">Оберіть дату й час</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {service.name} · {master.name}
        </p>
      </div>

      {!locationId ? (
        <div className="flex flex-col gap-3">
          <span className="text-sm text-fg-muted">Оберіть філію:</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setLocationId(location.id)}
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent-border"
              >
                <span className="font-display text-lg text-fg">{location.name}</span>
                <span className="text-xs text-fg-subtle">{location.address}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {availableLocations.length > 1 ? (
            <button
              type="button"
              onClick={() => setLocationId(null)}
              className="w-fit text-xs text-fg-subtle hover:text-fg"
            >
              Філія: {selectedLocation?.name} · змінити
            </button>
          ) : null}

          <SlotPicker
            masterId={master.id}
            locationId={locationId}
            serviceId={service.id}
            workingWeekdays={workingWeekdays}
            onLocked={(info) => onLocked({ locationId, ...info })}
          />
        </>
      )}
    </div>
  );
}
