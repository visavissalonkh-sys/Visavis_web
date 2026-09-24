import type { Metadata } from "next";
import { getAdminDashboardData } from "@/lib/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Адмін-панель",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  // Layout already guarantees requireAdmin() passed.
  const data = await getAdminDashboardData();
  return <AdminDashboard initialData={data} />;
}
