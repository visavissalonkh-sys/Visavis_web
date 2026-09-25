import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminLocationDetail, LocationNotFoundError } from "@/lib/admin";
import { AdminLocationForm } from "@/components/admin/AdminLocationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редагувати філію",
  robots: { index: false, follow: false },
};

export default async function AdminEditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail;
  try {
    detail = await getAdminLocationDetail(id);
  } catch (error) {
    if (error instanceof LocationNotFoundError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/locations" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі філії
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{detail.name}</h1>
      </div>

      <AdminLocationForm mode="edit" locationId={id} initial={detail} />
    </div>
  );
}
