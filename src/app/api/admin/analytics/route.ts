import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getAdminAnalytics, NotAdminError, InvalidDateRangeError } from "@/lib/admin";
import { adminAnalyticsQuerySchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminAnalyticsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні параметри періоду" }, { status: 400 });
  }

  try {
    const analytics = await getAdminAnalytics(parsed.data.from, parsed.data.to);
    return NextResponse.json(analytics);
  } catch (error) {
    if (error instanceof InvalidDateRangeError) {
      return NextResponse.json(
        { error: "invalid_range", message: "Період не може перевищувати 365 днів, і «до» має бути не раніше «від»" },
        { status: 400 },
      );
    }
    throw error;
  }
}
