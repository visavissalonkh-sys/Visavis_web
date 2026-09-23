/**
 * Normalizes any reasonable Ukrainian phone input to "+380XXXXXXXXX".
 * Returns null when the input can't be confidently normalized.
 *
 * Must stay in sync with Visavis_bot/bot/phone.py — matching by phone number
 * is how a Telegram account gets linked to a user created on the website.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("00380")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("380") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+38${digits}`;
  }

  if (digits.length === 9) {
    return `+380${digits}`;
  }

  return null;
}

/** Formats a normalized "+380XXXXXXXXX" phone as "+38 (0XX) XXX-XX-XX". */
export function formatPhoneDisplay(normalized: string): string {
  const match = normalized.match(/^\+380(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!match) return normalized;
  const [, area, first, second, third] = match;
  return `+38 (0${area}) ${first}-${second}-${third}`;
}
