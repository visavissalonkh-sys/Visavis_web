import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getAccountUser, getTelegramStatus } from "@/lib/account";
import { TelegramLinkStatus } from "@/components/account/TelegramLinkStatus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Telegram",
  robots: { index: false, follow: false },
};

export default async function AccountTelegramPage() {
  const session = await getSession();
  const user = await getAccountUser(session!);
  const status = getTelegramStatus(user!);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <h1 className="font-display text-2xl text-fg sm:text-3xl">Telegram</h1>
      <TelegramLinkStatus linked={status.linked} username={status.username} />
    </div>
  );
}
