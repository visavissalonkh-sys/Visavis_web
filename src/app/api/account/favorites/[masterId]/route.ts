import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { removeFavorite } from "@/lib/account";
import { isTrustedOrigin } from "@/lib/csrf";

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/account/favorites/[masterId]">) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { masterId } = await ctx.params;
  await removeFavorite(session.sub, masterId);
  return NextResponse.json({ success: true });
}
