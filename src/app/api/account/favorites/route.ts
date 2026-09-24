import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { addFavorite, getFavorites, MasterNotFoundError } from "@/lib/account";
import { addFavoriteSchema } from "@/lib/validation/account";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const favorites = await getFavorites(session.sub);
  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`account:favorites:add:${session.sub}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = addFavoriteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані" }, { status: 400 });
  }

  try {
    await addFavorite(session.sub, parsed.data.masterId);
  } catch (error) {
    if (error instanceof MasterNotFoundError) {
      return NextResponse.json({ error: "not_found", message: "Майстра не знайдено" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
