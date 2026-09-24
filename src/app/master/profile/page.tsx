import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getMasterForSession, getMasterProfile } from "@/lib/master";
import { MasterProfileForm } from "@/components/master/MasterProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профіль",
  robots: { index: false, follow: false },
};

export default async function MasterProfilePage() {
  const session = await getSession();
  const master = await getMasterForSession(session!);
  const profile = await getMasterProfile(master!.id);

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Профіль</h1>
        <p className="mt-1 text-sm text-fg-muted">Фото, опис та спеціалізації — те, що бачать клієнти.</p>
      </div>

      <MasterProfileForm
        initialProfile={profile.master}
        services={profile.services}
        initialSpecialtyIds={profile.specialtyServiceIds}
      />
    </div>
  );
}
