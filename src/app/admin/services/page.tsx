import type { Metadata } from "next";
import { getAdminServicesList } from "@/lib/admin";
import { AdminServicesList } from "@/components/admin/AdminServicesList";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Послуги",
  robots: { index: false, follow: false },
};

export default async function AdminServicesPage() {
  const services = await getAdminServicesList();

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Послуги</h1>
          <p className="mt-1 text-sm text-fg-muted">Усього: {services.length}</p>
        </div>
        <Button href="/admin/services/new">Додати послугу</Button>
      </div>

      <AdminServicesList initialServices={services} />
    </div>
  );
}
