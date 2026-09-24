import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAccountUser } from "@/lib/account";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { AccountBottomNav } from "@/components/account/AccountBottomNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth — proxy.ts already redirects here, but a route handler
  // or page must never trust a request purely because it got past the proxy.
  const session = await getSession();
  if (!session) redirect("/?auth=required");

  const user = await getAccountUser(session);
  if (!user) redirect("/?auth=required");

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <AccountSidebar userName={user.name ?? "Клієнт"} />
      <div className="flex-1 pb-20 lg:pb-0">{children}</div>
      <AccountBottomNav />
    </div>
  );
}
