import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { BookingStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getBookingsList, getMasterForSession } from "@/lib/master";

const querySchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const data = await getBookingsList({
    masterId: master.id,
    status: parsed.data.status as BookingStatus | undefined,
    date: parsed.data.date,
    page: parsed.data.page,
  });

  return NextResponse.json(data);
}
