import type { Metadata } from "next";
import { startOfWeek } from "date-fns";
import { getSession } from "@/lib/auth";
import { getAllActiveLocations, getMasterForSession, getMasterWorkingLocations, getWeekSchedule } from "@/lib/master";
import { formatDateOnly } from "@/lib/booking";
import { getSalonToday } from "@/lib/timezone";
import { WeeklyCalendar } from "@/components/master/WeeklyCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Розклад",
  robots: { index: false, follow: false },
};

export default async function MasterSchedulePage() {
  const session = await getSession();
  const master = await getMasterForSession(session!);

  const workingLocations = await getMasterWorkingLocations(master!.id);
  const locations = workingLocations.length > 0 ? workingLocations : await getAllActiveLocations();
  const locationId = locations[0]?.id ?? null;

  const weekStart = startOfWeek(getSalonToday(), { weekStartsOn: 1 });
  const days = locationId ? await getWeekSchedule(master!.id, locationId, weekStart) : [];

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Розклад</h1>
        <p className="mt-1 text-sm text-fg-muted">Тижневий вигляд занятості та вільного часу.</p>
      </div>

      <WeeklyCalendar
        initial={{
          locations: locations.map((l) => ({ id: l.id, name: l.name })),
          locationId,
          weekStart: formatDateOnly(weekStart),
          days,
        }}
      />
    </div>
  );
}
