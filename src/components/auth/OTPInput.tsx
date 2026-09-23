"use client";

import { useEffect, useRef } from "react";

const LENGTH = 6;

export function OTPInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const cells = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setDigitAt(index: number, digit: string) {
    const next = cells.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH) {
      onComplete(joined);
    }
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigitAt(index, digit);
    if (index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (cells[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigitAt(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === LENGTH) {
      onComplete(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {cells.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`h-14 w-11 rounded-xl border bg-surface text-center text-2xl text-fg outline-none transition-colors sm:h-16 sm:w-12 ${
            error ? "border-red-500" : "border-border-strong focus:border-accent"
          } disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
