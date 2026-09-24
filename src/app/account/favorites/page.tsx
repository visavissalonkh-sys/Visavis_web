import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getFavorites } from "@/lib/account";
import { FavoritesList } from "@/components/account/FavoritesList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Обрані майстри",
  robots: { index: false, follow: false },
};

export default async function AccountFavoritesPage() {
  const session = await getSession();
  const favorites = await getFavorites(session!.sub);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <h1 className="font-display text-2xl text-fg sm:text-3xl">Обрані майстри</h1>
      <FavoritesList initialFavorites={favorites} />
    </div>
  );
}
