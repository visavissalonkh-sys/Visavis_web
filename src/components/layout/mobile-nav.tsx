"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { HeaderAuthAction } from "@/components/auth/HeaderAuthAction";

const links = [
  { href: "/services", label: "Послуги" },
  { href: "/masters", label: "Майстри" },
  { href: "/locations", label: "Філії" },
  { href: "/reviews", label: "Відгуки" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Закрити меню" : "Відкрити меню"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5"
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

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-40 flex flex-col bg-bg/98 px-6 pt-28 pb-10 backdrop-blur">
              <nav className="flex flex-1 flex-col gap-6">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-3xl text-fg transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col items-start gap-4">
                <HeaderAuthAction className="text-base" />
                <MagneticButton>
                  <Button href="/booking" size="lg" onClick={() => setOpen(false)}>
                    Записатися
                  </Button>
                </MagneticButton>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
