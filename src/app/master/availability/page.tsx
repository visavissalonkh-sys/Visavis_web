import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getAllActiveLocations, getMasterForSession, getOverrides, getRegularSchedule } from "@/lib/master";
import { AvailabilityEditor } from "@/components/master/AvailabilityEditor";
import { OverrideCalendar } from "@/components/master/OverrideCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Доступність",
  robots: { index: false, follow: false },
};

export default async function MasterAvailabilityPage() {
  const session = await getSession();
  const master = await getMasterForSession(session!);

  const locations = await getAllActiveLocations();
  const initialLocationId = locations[0]?.id ?? null;
  const [schedule, overrides] = await Promise.all([
    initialLocationId ? getRegularSchedule(master!.id, initialLocationId) : Promise.resolve([]),
    getOverrides(master!.id),
  ]);

  return (
    <div className="flex flex-col gap-12 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Доступність</h1>
        <p className="mt-1 text-sm text-fg-muted">Регулярний розклад та разові зміни.</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Регулярний розклад</h2>
        <AvailabilityEditor
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          initialLocationId={initialLocationId}
          initialSchedule={schedule}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-fg-subtle">Разові зміни</h2>
        <OverrideCalendar initialOverrides={overrides} />
      </section>
    </div>
  );
}
