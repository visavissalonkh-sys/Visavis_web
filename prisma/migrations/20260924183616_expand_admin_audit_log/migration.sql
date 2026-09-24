-- AlterTable
ALTER TABLE "admin_audit_log" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "new_value" JSONB,
ADD COLUMN     "old_value" JSONB,
ADD COLUMN     "user_agent" TEXT;
