export const STATUS_LABELS: Record<string, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  completed: "Завершено",
  cancelled: "Скасовано",
  no_show: "Не з'явився",
};

export const STATUS_CLASSES: Record<string, string> = {
  pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  confirmed: "border-green-500/40 bg-green-500/10 text-green-400",
  completed: "border-border-strong bg-surface-2 text-fg-subtle",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-400",
  no_show: "border-red-500/40 bg-red-500/10 text-red-400",
};
