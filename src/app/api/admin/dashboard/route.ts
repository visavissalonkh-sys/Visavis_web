import { NextResponse, type NextRequest } from "next/server";
import type { BookingStatus } from "@prisma/client";
import { requireAdmin, getAdminDashboardData, NotAdminError } from "@/lib/admin";

const VALID_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const { searchParams } = request.nextUrl;
  const locationId = searchParams.get("locationId") ?? undefined;
  const masterId = searchParams.get("masterId") ?? undefined;
  const statusParam = searchParams.get("status");
  const status = statusParam && VALID_STATUSES.includes(statusParam as BookingStatus) ? (statusParam as BookingStatus) : undefined;

  const data = await getAdminDashboardData({ locationId, masterId, status });
  return NextResponse.json(data);
}
