import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBookingDetail } from "@/lib/account";
import { AccountBookingDetail } from "@/components/account/AccountBookingDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Деталі запису",
  robots: { index: false, follow: false },
};

export default async function AccountBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const booking = await getBookingDetail(session!.sub, id);
  if (!booking) notFound();

  return <AccountBookingDetail booking={booking} />;
}
