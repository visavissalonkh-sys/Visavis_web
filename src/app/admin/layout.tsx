import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin, logAdminAccessOnce, NotAdminError } from "@/lib/admin";
import { getAccountUser } from "@/lib/account";
import { getClientIp } from "@/lib/request-ip";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Level 2 of the three-level check (proxy.ts is level 1, audit log is
  // level 3) — a fresh Postgres read of the role, never just the JWT claim.
  // proxy.ts already redirects a non-admin session away from /admin, but a
  // layout must never trust that it ran, or that it's still in sync with
  // every route added later.
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) {
      redirect(error.reason === "no_session" ? "/?auth=required" : "/account");
    }
    throw error;
  }

  const user = await getAccountUser(admin.session);

  // Level 3: log this admin's access with IP + User-Agent (deduped to once
  // per ~10 minutes per session — see logAdminAccessOnce for why not every
  // single request).
  const requestHeaders = await headers();
  await logAdminAccessOnce({
    adminId: admin.adminId,
    jti: admin.session.jti,
    ip: getClientIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  });

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <AdminSidebar adminName={user?.name ?? "Адміністратор"} />
      <div className="flex-1 pb-20 lg:pb-0">{children}</div>
      <AdminBottomNav />
    </div>
  );
}
