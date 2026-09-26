import { SectionTheme, ThemeSeam } from "@/components/vv/SectionTheme";
import { MirrorLine, Reflection } from "@/components/vv/MirrorLine";
import { ArtSlot } from "@/components/vv/ArtSlot";
import { Glint } from "@/components/vv/Glint";

// Scratch component gallery for Phase 1 — not part of the site's navigation
// or sitemap, not linked from anywhere, local-only verification while the
// real sections get built in Phase 3. Safe to delete once Phase 3 is done.
export default function VvPreviewPage() {
  return (
    <div>
      <SectionTheme theme="night" className="flex min-h-[60vh] flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="flex items-center gap-8">
          <span className="font-display text-5xl" style={{ fontWeight: 300 }}>
            Краса,
          </span>
          <MirrorLine orientation="vertical" className="h-24" />
          <span className="font-display text-5xl italic">доведена</span>
        </div>
        <Reflection>
          <span className="font-display text-5xl" style={{ fontWeight: 300 }}>
            Краса,
          </span>
        </Reflection>

        <div className="relative mt-10 inline-block overflow-hidden rounded-full">
          <button className="relative rounded-full border border-vv-gold px-8 py-4 text-sm text-vv-gold">
            Записатися
            <Glint trigger="idle" />
          </button>
        </div>
        <p className="text-xs text-ink-light-2">Glint idle sweep fires every 8s, paused on tab-hide/reduced-motion</p>
      </SectionTheme>

      <ThemeSeam from="night" to="morning" />

      <SectionTheme theme="morning" className="flex flex-col items-center gap-12 px-6 py-24">
        <h2 className="font-display text-3xl text-ink-dark">ArtSlot — empty vs. portrait vs. photo</h2>
        <div className="grid w-full max-w-4xl gap-8 sm:grid-cols-3">
          <ArtSlot ratio="3:4" theme="morning" caption="Фото: інтер'єр, Сумська" />
          <ArtSlot ratio="3:4" theme="morning" kind="portrait" initials="ІМ" caption="Портрет: майстер" />
          <ArtSlot
            ratio="3:4"
            theme="morning"
            caption="Фото: демо-файл (local, не Unsplash)"
            src="/vv-preview-demo.png"
            glintOnHover
          />
        </div>
        <p className="max-w-md text-center text-sm text-ink-dark-2">
          Hover the third slot — Glint sweeps because a real photo exists. The first two never fire it.
        </p>
      </SectionTheme>

      <ThemeSeam from="morning" to="night" />

      <SectionTheme theme="night" className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h2 className="font-display text-3xl">Contrast check</h2>
        <p className="text-ink-light-2">ink-light-2 secondary text on night — 9.02:1</p>
        <p style={{ color: "var(--vv-gold-deep)" }} className="text-lg">
          this line uses --vv-gold-deep, intended for morning only — shown here just to eyeball the hue
        </p>
      </SectionTheme>
    </div>
  );
}
