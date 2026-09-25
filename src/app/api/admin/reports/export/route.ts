import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, generateAdminReportXlsx, NotAdminError, InvalidDateRangeError } from "@/lib/admin";
import { adminReportExportSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  // Exports pull raw client PII (name/phone) into a downloadable file — a
  // tighter budget than ordinary admin mutations is deliberate here.
  const limit = await rateLimit(`admin:reports:export:${admin.adminId}`, 10, 3600);
  if (!limit.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато експортів поспіль. Спробуйте за годину." },
      { status: 429 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = adminReportExportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    const { buffer, filename } = await generateAdminReportXlsx(parsed.data, admin, ip, userAgent);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
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
