import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/data/services";

export function Hero({ locationsCount }: { locationsCount: number }) {
  const stats = [
    { value: String(categories.length), label: "напрямків краси" },
    { value: String(locationsCount), label: "філії у Харкові" },
    { value: "1", label: "команда, єдиний стандарт якості" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-fg) 1px, transparent 1px), linear-gradient(90deg, var(--color-fg) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container className="relative flex min-h-[88vh] flex-col justify-center gap-14 py-24">
        <div className="animate-fade-up flex flex-col gap-8">
          <span className="inline-flex w-fit items-center gap-3 rounded-full border border-accent-border bg-accent-soft px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-accent">
            Мережа преміальних салонів краси · Харків
          </span>

          <h1 className="font-display max-w-4xl text-balance text-5xl leading-[1.05] text-fg sm:text-6xl lg:text-7xl">
            Краса, доведена до досконалості
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-fg-muted">
            Волосся, нігті, косметологія, перманентний макіяж і масаж — в одному
            просторі, де кожна деталь продумана заради вашого результату.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button href="/booking" size="lg">
              Записатися онлайн
            </Button>
            <Button href="/services" variant="outline" size="lg">
              Переглянути послуги
            </Button>
          </div>
        </div>

        <div className="animate-fade-up grid max-w-2xl grid-cols-3 gap-8 border-t border-border pt-8 [animation-delay:150ms]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="font-display text-3xl text-fg sm:text-4xl">
                {stat.value}
              </span>
              <span className="text-xs leading-snug text-fg-subtle">{stat.label}</span>
            </div>
          ))}
        </div>
      </Container>

      <div className="relative border-y border-border bg-surface py-4">
        <div className="no-scrollbar flex w-max animate-marquee gap-12 whitespace-nowrap">
          {[...categories, ...categories].map((category, i) => (
            <span
              key={`${category.slug}-${i}`}
              className="font-display text-xl text-fg-subtle sm:text-2xl"
            >
              {category.name}
              <span className="ml-12 text-accent">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
