import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminMasterForm } from "@/components/admin/AdminMasterForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Додати майстра",
  robots: { index: false, follow: false },
};

export default async function AdminNewMasterPage() {
  const [services, locations] = await Promise.all([
    prisma.service.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/masters" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі майстри
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">Додати майстра</h1>
      </div>

      <AdminMasterForm mode="create" services={services} allLocations={locations} />
    </div>
  );
}
