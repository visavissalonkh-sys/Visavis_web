"use client";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n} з 5`}
          aria-pressed={n <= value}
          className={cn(
            "text-3xl leading-none transition-colors disabled:cursor-not-allowed",
            n <= value ? "text-accent" : "text-fg-subtle hover:text-accent/60",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
