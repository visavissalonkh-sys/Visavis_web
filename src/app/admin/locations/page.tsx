import type { Metadata } from "next";
import { getAdminLocationsList } from "@/lib/admin";
import { AdminLocationsList } from "@/components/admin/AdminLocationsList";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Філії",
  robots: { index: false, follow: false },
};

export default async function AdminLocationsPage() {
  const locations = await getAdminLocationsList();

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Філії</h1>
          <p className="mt-1 text-sm text-fg-muted">Усього: {locations.length}</p>
        </div>
        <Button href="/admin/locations/new">Додати філію</Button>
      </div>

      <AdminLocationsList initialLocations={locations} />
    </div>
  );
}
