import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminMasterDetail, MasterNotFoundError } from "@/lib/admin";
import { AdminMasterForm } from "@/components/admin/AdminMasterForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редагувати майстра",
  robots: { index: false, follow: false },
};

export default async function AdminEditMasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail;
  try {
    detail = await getAdminMasterDetail(id);
  } catch (error) {
    if (error instanceof MasterNotFoundError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/masters" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі майстри
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{detail.master.name}</h1>
      </div>

      <AdminMasterForm
        mode="edit"
        masterId={id}
        initialName={detail.master.name}
        initialPhone={detail.phone}
        initialBio={detail.master.bio ?? ""}
        initialInstagramUrl={detail.master.instagramUrl ?? ""}
        initialAvatarUrl={detail.master.avatarUrl}
        initialSpecialtyIds={detail.specialtyServiceIds}
        services={detail.services}
        allLocations={detail.allLocations}
        initialSchedules={detail.schedules}
      />
    </div>
  );
}
