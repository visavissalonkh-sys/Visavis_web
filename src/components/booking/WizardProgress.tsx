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

  return (
    <div className="flex items-center gap-2 sm:gap-4">
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
  );
}
