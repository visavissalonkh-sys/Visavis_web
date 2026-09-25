import { NextResponse } from "next/server";
import { requireAdmin, getAdminReviewsQueue, getAdminPublishedReviews, NotAdminError } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const [queue, published] = await Promise.all([getAdminReviewsQueue(), getAdminPublishedReviews()]);
  return NextResponse.json({ queue, published });
}
