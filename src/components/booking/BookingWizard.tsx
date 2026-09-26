"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/container";
import { WizardProgress } from "@/components/booking/WizardProgress";
import { ServiceStep } from "@/components/booking/steps/ServiceStep";
import { MasterStep } from "@/components/booking/steps/MasterStep";
import { DateTimeStep } from "@/components/booking/steps/DateTimeStep";
import { ConfirmStep } from "@/components/booking/steps/ConfirmStep";
import type { BookingWizardData, WizardStep } from "@/components/booking/types";

const DRAFT_KEY = "visavis:booking:draft";
const DRAFT_TTL_MS = 60 * 60 * 1000; // 1 hour

type Draft = { serviceSlug: string; masterSlug?: string; savedAt: number };

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(draft: Omit<Draft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // ignore (private browsing, storage full, etc.)
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

type LockInfo = { locationId: string; date: string; time: string; lockToken: string; expiresAt: number };

export function BookingWizard({
  data,
  isAuthenticated,
}: {
  data: BookingWizardData;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceSlug = searchParams.get("service");
  const masterSlug = searchParams.get("master");
  const initialCategory = searchParams.get("category");

  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  // Always starts null so the very first client render matches the server
  // (which can never see localStorage) — reading the real draft in a lazy
  // initializer instead caused a hydration mismatch, since the client's
  // first render pass would already see it while SSR's couldn't. The
  // effect below fills it in immediately after mount instead.
  const [resumeDraft, setResumeDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (searchParams.get("service")) return;
    setResumeDraft(readDraft());
    // Intentionally runs once on mount only — a resumable draft is only
    // relevant for the very first render of the bare /booking route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Deep link from a master's page (`/booking?master=slug`) with no service
  // yet — remembered so picking a matching service can jump straight past
  // the master-selection step instead of being cleared.
  const [preferredMasterSlug] = useState<string | null>(() =>
    searchParams.get("service") ? null : searchParams.get("master"),
  );

  const service = useMemo(
    () => data.services.find((s) => s.seoSlug === serviceSlug) ?? null,
    [data.services, serviceSlug],
  );
  const master = useMemo(
    () => data.masters.find((m) => m.slug === masterSlug) ?? null,
    [data.masters, masterSlug],
  );
  const location = useMemo(
    () => (lockInfo ? data.locations.find((l) => l.id === lockInfo.locationId) ?? null : null),
    [data.locations, lockInfo],
  );

  const step: WizardStep = !service ? "service" : !master ? "master" : !lockInfo ? "datetime" : "confirm";

  function navigate(params: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(params)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    router.push(`/booking?${next.toString()}`);
  }

  const mastersForService = useMemo(() => {
    if (!service) return [];
    const masterIds = new Set(
      data.masterSpecialties.filter((ms) => ms.serviceId === service.id).map((ms) => ms.masterId),
    );
    return data.masters.filter((m) => masterIds.has(m.id));
  }, [data.masterSpecialties, data.masters, service]);

  return (
    <Container className="flex flex-col gap-10 py-16">
      <WizardProgress current={step} />

      {resumeDraft ? (
        <ResumeBanner
          draft={resumeDraft}
          services={data.services}
          masters={data.masters}
          onResume={() => {
            navigate({ service: resumeDraft.serviceSlug, master: resumeDraft.masterSlug ?? null });
            setResumeDraft(null);
          }}
          onDismiss={() => {
            clearDraft();
            setResumeDraft(null);
          }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-3xl">
        {step === "service" && (
          <ServiceStep
            categories={data.categories}
            services={data.services}
            initialCategory={initialCategory}
            onSelect={(s) => {
              const preferredOffersService =
                preferredMasterSlug &&
                data.masterSpecialties.some(
                  (ms) =>
                    ms.serviceId === s.id &&
                    data.masters.find((m) => m.slug === preferredMasterSlug)?.id === ms.masterId,
                );
              const nextMaster = preferredOffersService ? preferredMasterSlug : null;
              writeDraft({ serviceSlug: s.seoSlug, masterSlug: nextMaster ?? undefined });
              navigate({ service: s.seoSlug, master: nextMaster });
            }}
          />
        )}

        {step === "master" && service && (
          <MasterStep
            service={service}
            masters={mastersForService}
            onSelect={(m) => {
              writeDraft({ serviceSlug: service.seoSlug, masterSlug: m.slug });
              navigate({ master: m.slug });
            }}
            onBack={() => navigate({ service: null, master: null })}
          />
        )}

        {step === "datetime" && service && master && (
          <DateTimeStep
            service={service}
            master={master}
            locations={data.locations}
            masterLocations={data.masterLocations}
            onLocked={(info) => setLockInfo(info)}
            onBack={() => navigate({ master: null })}
          />
        )}

        {step === "confirm" && service && master && location && lockInfo && (
          <ConfirmStep
            service={service}
            master={master}
            location={location}
            date={lockInfo.date}
            time={lockInfo.time}
            lockToken={lockInfo.lockToken}
            expiresAt={lockInfo.expiresAt}
            isAuthenticated={isAuthenticated}
            onBack={() => setLockInfo(null)}
            onExpired={() => setLockInfo(null)}
            onSuccess={(bookingId) => {
              clearDraft();
              router.push(`/booking/success?id=${bookingId}`);
            }}
          />
        )}
      </div>
    </Container>
  );
}

function ResumeBanner({
  draft,
  services,
  masters,
  onResume,
  onDismiss,
}: {
  draft: Draft;
  services: BookingWizardData["services"];
  masters: BookingWizardData["masters"];
  onResume: () => void;
  onDismiss: () => void;
}) {
  const service = services.find((s) => s.seoSlug === draft.serviceSlug);
  const master = draft.masterSlug ? masters.find((m) => m.slug === draft.masterSlug) : null;
  if (!service) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start justify-between gap-3 rounded-2xl border border-accent-border bg-accent-soft p-4 text-sm text-fg sm:flex-row sm:items-center">
      <span>
        Продовжити запис на «{service.name}»{master ? ` до ${master.name}` : ""}?
      </span>
      <div className="flex gap-3">
        <button type="button" onClick={onResume} className="font-medium text-accent hover:text-accent-hover">
          Так, продовжити
        </button>
        <button type="button" onClick={onDismiss} className="text-fg-subtle hover:text-fg">
          Ні, спочатку
        </button>
      </div>
    </div>
  );
}
