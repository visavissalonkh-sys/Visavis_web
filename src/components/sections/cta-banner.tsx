import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function CtaBanner() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-accent-border bg-surface px-8 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 100%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="font-display max-w-2xl text-balance text-3xl text-fg sm:text-5xl">
              Оберіть послугу, майстра та зручний час — і залиште решту нам
            </h2>
            <MagneticButton>
              <Button href="/booking" size="lg">
                Записатися онлайн
              </Button>
            </MagneticButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
