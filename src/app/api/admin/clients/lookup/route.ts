import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, lookupClientByPhone, NotAdminError } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "invalid_input", message: "Вкажіть номер телефону" }, { status: 400 });
  }

  const client = await lookupClientByPhone(phone);
  return NextResponse.json({ client });
}
