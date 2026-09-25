import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/notifications";

/**
 * Pushes `text` to every admin with a linked Telegram account — the web half
 * of the bot admin panel's real-time alerts (Stage 5 section 4). Fire-and-
 * forget at every call site, same convention as the existing master/client
 * notifications in this codebase: a Telegram hiccup must never fail the
 * actual request (booking creation, cancellation, etc).
 */
export async function notifyAdmins(text: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "admin", telegramId: { not: null } },
    select: { telegramId: true },
  });

  await Promise.all(
    admins.map((admin) =>
      sendTelegramMessage(admin.telegramId!.toString(), text).catch((error) =>
        console.error("Failed to notify admin", error),
      ),
    ),
  );
}
