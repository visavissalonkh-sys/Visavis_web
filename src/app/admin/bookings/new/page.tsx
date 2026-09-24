import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBookingFormOptions } from "@/lib/admin";
import { AdminCreateBookingForm } from "@/components/admin/AdminCreateBookingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Створити запис",
  robots: { index: false, follow: false },
};

export default async function AdminCreateBookingPage() {
  const formOptions = await getAdminBookingFormOptions();

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/admin/bookings" className="text-sm text-fg-subtle transition-colors hover:text-fg">
          ← Усі записи
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">Створити запис</h1>
        <p className="mt-1 text-sm text-fg-muted">Для клієнта, що зателефонував — без OTP.</p>
      </div>

      <AdminCreateBookingForm formOptions={formOptions} />
    </div>
  );
}
