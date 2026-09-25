import type { Metadata } from "next";
import Link from "next/link";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Додати послугу",
  robots: { index: false, follow: false },
};

export default function AdminNewServicePage() {
  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/services" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі послуги
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">Додати послугу</h1>
      </div>

      <AdminServiceForm mode="create" />
    </div>
  );
}
