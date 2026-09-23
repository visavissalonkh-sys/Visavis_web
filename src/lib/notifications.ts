import { requireEnv } from "@/lib/env";

// Overridable so local/CI tests can point this at a stub instead of the real
// Telegram API.
const TELEGRAM_API = process.env.TELEGRAM_API_BASE_URL ?? "https://api.telegram.org";

type InlineButton = { text: string; callback_data?: string; url?: string };

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { inlineKeyboard?: InlineButton[][] },
): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: options?.inlineKeyboard
        ? { inline_keyboard: options.inlineKeyboard }
        : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}
