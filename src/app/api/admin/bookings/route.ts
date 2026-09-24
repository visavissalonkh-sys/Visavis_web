import { NextResponse, type NextRequest } from "next/server";
import type { BookingStatus } from "@prisma/client";
import {
  requireAdmin,
  getAdminBookingsList,
  getAdminBookingFormOptions,
  createAdminBooking,
  NotAdminError,
  BookingNotFoundError,
  MasterServiceMismatchError,
  InvalidPhoneError,
  PastDateError,
  SlotUnavailableError,
  CriticalSectionBusyError,
} from "@/lib/admin";
import { adminCreateBookingSchema, adminBookingsListQuerySchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminBookingsListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні параметри фільтра" }, { status: 400 });
  }

  const { dateFrom, dateTo, masterId, locationId, status, search, sortBy, sortDir, page } = parsed.data;
  const statuses = status
    ? status.split(",").filter((s): s is BookingStatus => ALL_STATUSES.includes(s as BookingStatus))
    : undefined;

  const [list, formOptions] = await Promise.all([
    getAdminBookingsList({ dateFrom, dateTo, masterId, locationId, statuses, search, sortBy, sortDir, page: page ?? 1 }),
    getAdminBookingFormOptions(),
  ]);

  return NextResponse.json({ ...list, formOptions });
}

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

  const limit = await rateLimit(`admin:bookings:create:${admin.adminId}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminCreateBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    const booking = await createAdminBooking(parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (error) {
    if (error instanceof InvalidPhoneError) {
      return NextResponse.json({ error: "invalid_phone", message: "Невірний номер телефону" }, { status: 400 });
    }
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "not_found", message: "Послугу, майстра або філію не знайдено" }, { status: 404 });
    }
    if (error instanceof MasterServiceMismatchError) {
      return NextResponse.json({ error: "invalid_master", message: "Цей майстер не надає обрану послугу" }, { status: 400 });
    }
    if (error instanceof PastDateError) {
      return NextResponse.json({ error: "past_date", message: "Не можна створити запис на минулу дату" }, { status: 400 });
    }
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: "slot_unavailable", message: "Цей час вже зайнято" }, { status: 409 });
    }
    if (error instanceof CriticalSectionBusyError) {
      return NextResponse.json({ error: "busy", message: "Спробуйте ще раз за кілька секунд" }, { status: 409 });
    }
    throw error;
  }
}
