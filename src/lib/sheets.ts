import { redis } from "@/lib/redis";

// Consumed by Visavis_bot/bot/workers/sheets_worker.py via BLPOP on the same
// key — this is only the producer side. The payload only carries an ID
// (never the booking's own data): the worker re-reads the booking's CURRENT
// state from Postgres at sync time, so a dropped/delayed queue entry can
// never write stale data, and `action` is purely informational (logging) —
// the worker always upserts by ID regardless of which action queued it.
const QUEUE_KEY = "sheets:queue";

export type SheetsSyncAction = "created" | "status_changed" | "cancelled";

export async function queueSheetsSync(bookingId: string, action: SheetsSyncAction): Promise<void> {
  await redis.rpush(QUEUE_KEY, JSON.stringify({ bookingId, action, queuedAt: new Date().toISOString() }));
}
