import type { Metadata } from "next";
import Link from "next/link";
import { AdminLocationForm } from "@/components/admin/AdminLocationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Додати філію",
  robots: { index: false, follow: false },
};

export default function AdminNewLocationPage() {
  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/locations" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі філії
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">Додати філію</h1>
      </div>

      <AdminLocationForm mode="create" />
    </div>
  );
}
