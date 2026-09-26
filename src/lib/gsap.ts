"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  // Named eases mirroring globals.css's --ease-out/--ease-inout/--ease-glint
  // (DESIGN.md §3.4) — GSAP can't read CSS custom properties for `ease`, so
  // these are the one place the two have to be kept in sync by hand.
  CustomEase.create("vv-out", "0.16, 1, 0.3, 1");
  CustomEase.create("vv-inout", "0.65, 0, 0.35, 1");
  CustomEase.create("vv-glint", "0.25, 0.1, 0.25, 1");
}

export { gsap, ScrollTrigger };
