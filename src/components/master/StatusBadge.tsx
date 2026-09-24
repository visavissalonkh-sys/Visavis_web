import { cn } from "@/lib/utils";
import { STATUS_CLASSES, STATUS_LABELS } from "@/components/master/status-badge";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs", STATUS_CLASSES[status])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
