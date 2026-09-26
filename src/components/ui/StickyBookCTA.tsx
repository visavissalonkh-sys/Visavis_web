"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Mobile-only floating "book now" bar that appears once the page's own
 * primary CTA (identified by `anchorId`) has scrolled out of view, and
 * disappears again once it's back on screen — so there's never two
 * identical buttons visible at once.
 */
export function StickyBookCTA({ href, label, anchorId }: { href: string; label: string; anchorId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg px-6 pt-4 transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      aria-hidden={!visible}
    >
      <Button href={href} size="lg" className="w-full" tabIndex={visible ? undefined : -1}>
        {label}
      </Button>
    </div>
  );
}
