import { cn } from "@/lib/utils";
import type { WizardStep } from "@/components/booking/types";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "service", label: "Послуга" },
  { key: "master", label: "Майстер" },
  { key: "datetime", label: "Час" },
  { key: "confirm", label: "Підтвердження" },
];

export function WizardProgress({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  const fillPercent = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Mobile: step number + current label + a thin fill bar — four circles
          in a row don't fit 390px cleanly once labels are involved. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <span className="text-sm text-fg-muted">
          Крок {currentIndex + 1} з {STEPS.length} — <span className="text-fg">{STEPS[currentIndex].label}</span>
        </span>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${fillPercent}%` }} />
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex sm:gap-4">
        {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  isDone && "border-accent bg-accent text-accent-foreground",
                  isCurrent && "border-accent text-accent",
                  !isDone && !isCurrent && "border-border-strong text-fg-subtle",
                )}
              >
                {isDone ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  isCurrent ? "text-fg" : "text-fg-subtle",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div className={cn("h-px flex-1", isDone ? "bg-accent" : "bg-border")} />
            ) : null}
          </div>
        );
        })}
      </div>
    </>
  );
}
