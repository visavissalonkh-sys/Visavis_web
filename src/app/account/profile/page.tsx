import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getAccountUser } from "@/lib/account";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профіль",
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const session = await getSession();
  const user = await getAccountUser(session!);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <h1 className="font-display text-2xl text-fg sm:text-3xl">Профіль</h1>
      <AccountProfileForm initialName={user!.name} phone={user!.phone} createdAt={user!.createdAt.toISOString()} />
    </div>
  );
}
