import { addDays, endOfWeek, startOfWeek, subDays } from "date-fns";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, bumpTokenVersion, type SessionPayload } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { timeToMinutes } from "@/lib/booking";
import { getSalonToday } from "@/lib/timezone";

/** `reason: "no_session"` means not logged in at all (send to the login
 * modal); `"not_admin"` means logged in but the fresh DB check says this
 * account isn't (or no longer is) an admin — this is the case that catches
 * a stale JWT after a demotion, and deserves a different redirect (they
 * have an account, just not this permission) than "please log in". */
export class NotAdminError extends Error {
  constructor(public readonly reason: "no_session" | "not_admin") {
    super(reason);
  }
}

export type AdminContext = { session: SessionPayload; adminId: string };

/**
 * Unlike getSession() (JWT-only — fast, no DB), this re-reads the user's
 * role from Postgres on every single call instead of trusting the JWT's
 * `role` claim. A role can go stale the moment an admin is demoted, and
 * admin actions are high-stakes enough to pay for a fresh by-primary-key
 * lookup every time rather than trust a token that might be minutes or
 * hours old. Every /api/admin/* route must start with this — Level 2 of
 * the three-level check (middleware → this → audit log).
 */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await getSession();
  if (!session) throw new NotAdminError("no_session");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } });
  if (!user || user.role !== "admin") throw new NotAdminError("not_admin");

  return { session, adminId: session.sub };
}

/**
 * Level 3 of the admin security model: every admin action gets one
 * immutable row here. There is deliberately no update/delete path for this
 * table anywhere in the codebase — only prisma.adminAuditLog.create calls
 * (this one, and the pre-existing logMasterAudit in lib/master.ts, which
 * predates the ip/userAgent/oldValue/newValue columns and doesn't set
 * them — those stay null on that older set of actions).
 */
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

const ACCESS_LOG_DEDUP_SECONDS = 600;

/**
 * Level 3's "log every entry to /admin" from the spec, made practical: the
 * admin layout wraps every single page under /admin, so a literal per-
 * request log would also fire on Next's own Link-prefetch requests and
 * every internal client-side navigation RSC fetch — noise, not signal, and
 * a self-inflicted way to flood this table. This logs the first access in
 * a rolling 10-minute window per session (keyed by jti) and skips the rest
 * of that window — one atomic Redis SET NX, so concurrent requests can't
 * both win and double-log. Still gives full IP/User-Agent forensics on
 * "did this admin access the panel, from where" without the noise.
 */
export async function logAdminAccessOnce(params: {
  adminId: string;
  jti: string;
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  const key = `admin:access-logged:${params.jti}`;
  const wonRace = await redis.set(key, "1", "EX", ACCESS_LOG_DEDUP_SECONDS, "NX");
  if (wonRace === null) return;

  await logAdminAction({
    actorId: params.adminId,
    action: "admin_access",
    entityType: "admin_panel",
    entityId: params.adminId,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

/**
 * Kills every session the target user currently has open, on every device,
 * immediately — used after changing someone's role or deactivating a
 * master, so a stale JWT can't keep granting the old role/access for the
 * rest of its natural lifetime (up to 30 days for a client/master token).
 */
export async function blacklistUserJWTs(userId: string): Promise<void> {
  await bumpTokenVersion(userId);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const OCCUPYING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed"];
const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const WORKLOAD_SLOT_MINUTES = 30;
const RECENT_ACTIONS_LIMIT = 20;

export type AdminDashboardFilters = {
  locationId?: string;
  masterId?: string;
  status?: BookingStatus;
};

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

export async function getAdminDashboardData(filters: AdminDashboardFilters = {}) {
  const today = getSalonToday();
  const tomorrow = addDays(today, 1);
  const weekFrom = startOfWeek(today, { weekStartsOn: 1 });
  const weekTo = endOfWeek(today, { weekStartsOn: 1 });
  const sevenDaysAgo = subDays(new Date(), 7);
  const todayWeekday = new Date().getDay(); // 0 = Sunday .. 6 = Saturday, matches the schema's convention

  const [
    todayBookingsAll,
    weekTotal,
    newClientsCount,
    activeMasters,
    locations,
    recentActionsRaw,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { date: today },
      include: { client: true, master: true, service: true, location: true },
      orderBy: { timeFrom: "asc" },
    }),
    prisma.booking.count({ where: { date: { gte: weekFrom, lte: weekTo } } }),
    prisma.user.count({ where: { role: "client", createdAt: { gte: sevenDaysAgo } } }),
    prisma.master.findMany({
      where: { isActive: true },
      include: { masterLocations: true, availabilityOverrides: { where: { date: today } } },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: RECENT_ACTIONS_LIMIT }),
  ]);

  const todayConfirmed = todayBookingsAll.filter((b) => b.status === "confirmed").length;
  const todayCancelled = todayBookingsAll.filter((b) => b.status === "cancelled").length;

  const filteredTodayBookings = todayBookingsAll.filter((b) => {
    if (filters.locationId && b.locationId !== filters.locationId) return false;
    if (filters.masterId && b.masterId !== filters.masterId) return false;
    if (filters.status && b.status !== filters.status) return false;
    return true;
  });

  const masterWorkload = activeMasters.map((master) => {
    const dayOff = master.availabilityOverrides.some((o) => o.type === "day_off");

    const workingMinutesToday = master.masterLocations
      .filter((ml) => ml.weekday === todayWeekday)
      .reduce((sum, ml) => sum + Math.max(0, timeToMinutes(ml.timeTo) - timeToMinutes(ml.timeFrom)), 0);

    const bookedCount = todayBookingsAll.filter(
      (b) => b.masterId === master.id && OCCUPYING_STATUSES.includes(b.status),
    ).length;

    const totalSlots = dayOff ? 0 : Math.round(workingMinutesToday / WORKLOAD_SLOT_MINUTES);

    return {
      masterId: master.id,
      masterName: master.name,
      isDayOff: dayOff || workingMinutesToday === 0,
      bookedSlots: bookedCount,
      totalSlots,
      percentage: totalSlots > 0 ? Math.min(100, Math.round((bookedCount / totalSlots) * 100)) : 0,
    };
  });

  const actorIds = [...new Set(recentActionsRaw.map((a) => a.actorId))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, phone: true } })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return {
    metrics: {
      todayTotal: todayBookingsAll.length,
      todayConfirmed,
      todayCancelled,
      weekTotal,
      activeMastersToday: masterWorkload.filter((m) => m.bookedSlots > 0).length,
      newClientsLast7Days: newClientsCount,
    },
    todayBookings: filteredTodayBookings.map((b) => ({
      id: b.id,
      timeFrom: b.timeFrom,
      clientName: b.client.name,
      clientPhone: b.client.phone,
      masterName: b.master.name,
      serviceName: b.service.name,
      locationName: b.location.name,
      status: b.status,
    })),
    masterWorkload,
    recentActions: recentActionsRaw.map((a) => ({
      id: a.id,
      actorName: actorById.get(a.actorId)?.name ?? actorById.get(a.actorId)?.phone ?? a.actorId,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt.toISOString(),
    })),
    filterOptions: {
      locations,
      masters: activeMasters.map((m) => ({ id: m.id, name: m.name })),
      statuses: ALL_STATUSES,
    },
  };
}
