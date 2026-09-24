import type { Metadata } from "next";
import { getAdminMastersList } from "@/lib/admin";
import { AdminMastersList } from "@/components/admin/AdminMastersList";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Майстри",
  robots: { index: false, follow: false },
};

export default async function AdminMastersPage() {
  const masters = await getAdminMastersList();

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Майстри</h1>
          <p className="mt-1 text-sm text-fg-muted">Усього: {masters.length}</p>
        </div>
        <Button href="/admin/masters/new">Додати майстра</Button>
      </div>

      <AdminMastersList initialMasters={masters} />
    </div>
  );
}
