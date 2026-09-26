import { Hero } from "@/components/vv/sections/Hero";

// Scratch route for screenshotting Hero in isolation (DESIGN.md §9 process:
// build, screenshot, self-critique, commit — one section at a time). Not
// linked from nav. The real homepage keeps its current Hero until enough
// §6 sections exist that swapping it in doesn't strand a Night hero above
// old cream sections.
export default function VvPreviewHeroPage() {
  return <Hero />;
}
