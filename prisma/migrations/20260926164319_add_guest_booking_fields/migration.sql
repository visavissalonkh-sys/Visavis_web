-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "guest_name" TEXT,
ADD COLUMN     "guest_phone" TEXT,
ADD COLUMN     "is_guest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "client_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "bookings_guest_phone_idx" ON "bookings"("guest_phone");

-- Data-integrity guard the application code must never violate: exactly one
-- of (a linked client) or (a guest identified by phone), never both, never
-- neither. Enforced at the database level, not just in application code —
-- both Visavis_web (Prisma) and Visavis_bot (SQLAlchemy) write to this
-- table, so an app-level-only check could be bypassed by either side.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_or_client_check" CHECK (
  ("is_guest" = false AND "client_id" IS NOT NULL AND "guest_phone" IS NULL)
  OR
  ("is_guest" = true AND "client_id" IS NULL AND "guest_phone" IS NOT NULL)
);
