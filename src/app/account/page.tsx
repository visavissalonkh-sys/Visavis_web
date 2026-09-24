import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAccountUser, getDashboardData } from "@/lib/account";
import { AccountDashboard } from "@/components/account/AccountDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Особистий кабінет",
  robots: { index: false, follow: false },
};

export default async function AccountDashboardPage() {
  // Layout already guarantees a session + a User row exists.
  const session = await getSession();
  const user = await getAccountUser(session!);
  if (!user) redirect("/?auth=required");

  const data = await getDashboardData(user);
  return <AccountDashboard data={data} />;
}
