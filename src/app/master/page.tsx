import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDashboardData, getMasterForSession } from "@/lib/master";
import { MasterDashboard } from "@/components/master/MasterDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Кабінет майстра",
  robots: { index: false, follow: false },
};

export default async function MasterDashboardPage() {
  // Layout already guarantees session + master role + a Master row exists.
  const session = await getSession();
  const master = await getMasterForSession(session!);
  const data = await getDashboardData(master!.id, master!.name);

  return <MasterDashboard initialData={data} />;
}
