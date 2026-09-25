import type { Metadata } from "next";
import { getAdminReviewsQueue, getAdminPublishedReviews } from "@/lib/admin";
import { AdminReviewsPanel } from "@/components/admin/AdminReviewsPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Відгуки",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage() {
  const [queue, published] = await Promise.all([getAdminReviewsQueue(), getAdminPublishedReviews()]);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Відгуки</h1>
        <p className="mt-1 text-sm text-fg-muted">На модерації: {queue.length}</p>
      </div>

      <AdminReviewsPanel initialQueue={queue} initialPublished={published} />
    </div>
  );
}
