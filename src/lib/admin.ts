import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, bumpTokenVersion, type SessionPayload } from "@/lib/auth";

export class NotAdminError extends Error {}

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
  if (!session) throw new NotAdminError();

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } });
  if (!user || user.role !== "admin") throw new NotAdminError();

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

/**
 * Kills every session the target user currently has open, on every device,
 * immediately — used after changing someone's role or deactivating a
 * master, so a stale JWT can't keep granting the old role/access for the
 * rest of its natural lifetime (up to 30 days for a client/master token).
 */
export async function blacklistUserJWTs(userId: string): Promise<void> {
  await bumpTokenVersion(userId);
}
