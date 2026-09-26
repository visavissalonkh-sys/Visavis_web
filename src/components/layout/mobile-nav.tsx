"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeaderAuthAction } from "@/components/auth/HeaderAuthAction";
import { gsap } from "@/lib/gsap";
import type { PublicLocation } from "@/lib/locations";

const links = [
  { href: "/services", label: "Послуги" },
  { href: "/masters", label: "Майстри" },
  { href: "/locations", label: "Філії" },
  { href: "/reviews", label: "Відгуки" },
];

const SWIPE_CLOSE_THRESHOLD_PX = 80;

export function MobileNav({ locations }: { locations: PublicLocation[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const isFirstRun = useRef(true);

  useLayoutEffect(() => setMounted(true), []);

  // Overlay is always in the DOM (not conditionally rendered) so GSAP can
  // animate it OUT, not just remove it — but it must never intercept clicks
  // while closed, which is why pointer-events is driven imperatively here
  // rather than left to a CSS class keyed only on `open`. The regression
  // this guards against: a stale open overlay eating clicks on the page
  // behind it after it was supposed to have closed.
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el || !mounted) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = el.querySelectorAll(".mobile-nav-item");

    // On mount, the menu has never been open — snap it instantly closed
    // instead of playing the close TRANSITION, which briefly sets
    // visibility:visible/opacity:1 as its starting point (a real flash of
    // the fully-laid-out menu over the page for one frame on every load).
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (!open) {
        gsap.set(el, { autoAlpha: 0, yPercent: 100 });
        gsap.set(items, { autoAlpha: 0, y: 24 });
        el.style.pointerEvents = "none";
        return;
      }
    }

    if (open) {
      el.style.pointerEvents = "auto";
      if (reducedMotion) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        gsap.set(items, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap
        .timeline()
        .set(el, { autoAlpha: 1 })
        .fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "power3.out" })
        .fromTo(
          items,
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.35, stagger: 0.05, ease: "power2.out" },
          "-=0.2",
        );
    } else {
      // Set synchronously, not in the tween's onComplete — a rapid
      // close-then-reopen kills this tween via GSAP's same-target overwrite,
      // and an onComplete from a killed tween is not guaranteed to fire
      // before the next open sets pointerEvents back to "auto", which could
      // leave the overlay clickable-but-invisible. Cutting interactivity the
      // instant a close starts has no such ordering hazard.
      el.style.pointerEvents = "none";
      if (reducedMotion) {
        gsap.set(el, { autoAlpha: 0 });
        return;
      }
      gsap.to(el, { yPercent: 100, autoAlpha: 0, duration: 0.35, ease: "power2.in" });
    }
  }, [open, mounted]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_CLOSE_THRESHOLD_PX) setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Закрити меню" : "Відкрити меню"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-1.5"
      >
        <span
          className={`h-px w-6 bg-fg transition-transform duration-300 ${open ? "translate-y-[3px] rotate-45" : ""}`}
        />
        <span
          className={`h-px w-6 bg-fg transition-opacity duration-300 ${open ? "opacity-0" : "opacity-100"}`}
        />
        <span
          className={`h-px w-6 bg-fg transition-transform duration-300 ${open ? "-translate-y-[5px] -rotate-45" : ""}`}
        />
      </button>

      {mounted
        ? createPortal(
            <div
              ref={overlayRef}
              className="invisible fixed inset-0 z-40 flex flex-col bg-bg px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+5rem)]"
              style={{ pointerEvents: "none" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <nav className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="mobile-nav-item w-full border-b border-accent/25 py-4 font-display text-[2rem] text-fg transition-colors last:border-0 hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mobile-nav-item flex flex-col items-center gap-4 pt-6">
                <HeaderAuthAction className="text-base" />
                <Button href="/booking" size="lg" onClick={() => setOpen(false)} className="w-full">
                  Записатися
                </Button>

                <div className="flex flex-col items-center gap-1 pt-2 text-sm text-fg-muted">
                  {locations.map((location) => (
                    <a key={location.slug} href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`} className="hover:text-fg">
                      {location.name} · {location.phone}
                    </a>
                  ))}
                </div>

                <a
                  href="https://www.instagram.com/salon_vis_a_vis"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram Visavis"
                  className="flex h-11 w-11 items-center justify-center text-fg-muted transition-colors hover:text-accent"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
