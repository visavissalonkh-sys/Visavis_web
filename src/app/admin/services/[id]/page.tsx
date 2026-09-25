import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminServiceDetail, ServiceNotFoundError } from "@/lib/admin";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редагувати послугу",
  robots: { index: false, follow: false },
};

export default async function AdminEditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail;
  try {
    detail = await getAdminServiceDetail(id);
  } catch (error) {
    if (error instanceof ServiceNotFoundError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/services" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі послуги
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{detail.name}</h1>
      </div>

      <AdminServiceForm mode="edit" serviceId={id} initial={detail} />
    </div>
  );
}
