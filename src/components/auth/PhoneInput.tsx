"use client";

import { useId } from "react";

// Formats digits as the user types into "+38 (0XX) XXX-XX-XX".
function formatAsTyped(digits: string): string {
  const d = digits.slice(0, 10); // 0XXXXXXXXX — 10 digits
  let out = "+38";
  if (d.length > 0) out += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

export function PhoneInput({
  digits,
  onChange,
  disabled,
  autoFocus,
}: {
  /** Local digits only, "0XXXXXXXXX" (up to 10), no country code. */
  digits: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-fg-muted">
        Номер телефону
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder="+38 (0XX) XXX-XX-XX"
        value={formatAsTyped(digits)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          // Drop a leading country code if the user pastes a full number.
          const local = raw.startsWith("380") ? `0${raw.slice(3)}` : raw;
          onChange(local.slice(0, 10));
        }}
        className="h-[52px] w-full rounded-xl border border-border-strong bg-surface px-4 text-lg tracking-wide text-fg outline-none transition-colors focus:border-accent disabled:opacity-50"
      />
    </div>
  );
}

export function isCompletePhoneDigits(digits: string): boolean {
  return digits.length === 10 && digits.startsWith("0");
}
