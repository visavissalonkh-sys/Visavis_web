import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMasterForSession } from "@/lib/master";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { MasterBottomNav } from "@/components/master/MasterBottomNav";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth — proxy.ts already redirects here, but a route handler
  // or page must never trust a request purely because it got past the proxy.
  const session = await getSession();
  if (!session) redirect("/?auth=required");
  if (session.role !== "master") redirect("/account");

  const master = await getMasterForSession(session);
  if (!master) redirect("/account");

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <MasterSidebar masterName={master.name} />
      <div className="flex-1 pb-20 lg:pb-0">{children}</div>
      <MasterBottomNav />
    </div>
  );
}
