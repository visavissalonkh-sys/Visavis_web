import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getAdminAuditLog, getAdminAuditFilterOptions, NotAdminError } from "@/lib/admin";
import { adminAuditQuerySchema } from "@/lib/validation/admin";

// Read-only by design: this file exports GET only. There is no PATCH/DELETE
// handler here and none should ever be added — AdminAuditLog has no
// update/delete path anywhere in the codebase (see schema.prisma).
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminAuditQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні параметри фільтра" }, { status: 400 });
  }

  const { actorId, action, dateFrom, dateTo, page } = parsed.data;

  const [list, filterOptions] = await Promise.all([
    getAdminAuditLog({ actorId, action, dateFrom, dateTo, page: page ?? 1 }),
    getAdminAuditFilterOptions(),
  ]);

  return NextResponse.json({ ...list, filterOptions });
}
