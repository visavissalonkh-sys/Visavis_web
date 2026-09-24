import { format } from "date-fns";
import { uk } from "date-fns/locale";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function ClientCard({
  client,
}: {
  client: {
    name: string | null;
    phone: string;
    totalVisits: number;
    recentVisits: { date: string; serviceName: string; status: string; comment: string | null }[];
  };
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-accent">
          {initials(client.name)}
        </div>
        <div>
          <div className="text-fg">{client.name ?? "Клієнт"}</div>
          <a href={`tel:${client.phone}`} className="text-sm text-accent hover:text-accent-hover">
            {client.phone}
          </a>
        </div>
      </div>

      <div className="text-sm text-fg-muted">
        Відвідала майстра <span className="text-fg">{client.totalVisits}</span>{" "}
        {client.totalVisits === 1 ? "раз" : "разів"}
      </div>

      {client.recentVisits.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">Останні візити</span>
          {client.recentVisits.map((visit, i) => (
            <div key={i} className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fg">
                  {format(new Date(`${visit.date}T00:00:00.000Z`), "d MMMM yyyy", { locale: uk })} — {visit.serviceName}
                </span>
              </div>
              {visit.comment ? <p className="text-xs text-fg-subtle">«{visit.comment}»</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-fg-subtle">Це перший запис клієнта до вас.</p>
      )}
    </div>
  );
}
